// @ts-nocheck — This file runs on Supabase Deno runtime, not Node.js
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    let payload: {
        to: string;        // Recipient phone in E.164 format, e.g. +919876543210
        body: string;      // SMS message text
        // Twilio credentials from Branch Settings
        accountSid?: string;
        authToken?: string;
        fromNumber?: string; // Twilio "From" number or Messaging Service SID
    };

    try {
        payload = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const { to, body, accountSid, authToken, fromNumber } = payload;

    console.log(`==> SMS request to: ${to}`);

    if (!to || !body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    // Resolve credentials: branch-level first, fall back to Supabase secrets
    const sid = accountSid || Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = authToken || Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = fromNumber || Deno.env.get('TWILIO_FROM_NUMBER');

    if (!sid || !token || !from) {
        const missing = [!sid && 'accountSid', !token && 'authToken', !from && 'fromNumber'].filter(Boolean).join(', ');
        console.error(`==> Twilio credentials missing: ${missing}`);
        return new Response(
            JSON.stringify({
                error: `Twilio credentials missing: ${missing}. Add them in Branch Settings → SMS Gateway.`,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }

    // E.164 basic validation
    const cleanTo = to.startsWith('+') ? to : `+${to.replace(/\D/g, '')}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const formBody = new URLSearchParams({
        To: cleanTo,
        From: from,
        Body: body,
    });

    const credentials = btoa(`${sid}:${token}`);

    try {
        const twRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody.toString(),
        });

        const twData = await twRes.json();
        console.log(`==> Twilio response status: ${twRes.status}`);

        if (twRes.ok && twData.sid) {
            console.log(`==> Twilio SMS queued: ${twData.sid}, status: ${twData.status}`);
            return new Response(
                JSON.stringify({ success: true, messageSid: twData.sid, status: twData.status }),
                { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
        }

        console.error(`==> Twilio error: ${twData.message} (code ${twData.code})`);
        return new Response(
            JSON.stringify({ error: `Twilio error ${twData.code}: ${twData.message}`, detail: twData }),
            { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`==> Exception: ${message}`);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }
});
