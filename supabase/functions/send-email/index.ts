// @ts-nocheck — This file runs on Supabase Deno runtime, not Node.js
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildHtml(body: string, category: string): string {
    const colors: Record<string, string> = {
        WELCOME: '#10b981',
        PAYMENT: '#3b82f6',
        REMINDER: '#f59e0b',
        ANNOUNCEMENT: '#8b5cf6',
    };
    const icons: Record<string, string> = {
        WELCOME: '👋',
        PAYMENT: '💳',
        REMINDER: '⏰',
        ANNOUNCEMENT: '📢',
    };

    const accent = colors[category] || '#3b82f6';
    const icon = icons[category] || '🔔';
    const htmlBody = body.replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IronFlow Notification</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${accent};padding:32px 40px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">${icon}</div>
          <div style="color:#fff;font-size:11px;font-weight:900;letter-spacing:3px;text-transform:uppercase;opacity:0.8;">${category}</div>
        </td></tr>
        <tr><td style="background:#0f172a;padding:12px 40px;text-align:center;">
          <span style="color:#fff;font-size:14px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">⚡ IRONFLOW</span>
        </td></tr>
        <tr><td style="padding:40px;color:#374151;font-size:15px;line-height:1.7;">${htmlBody}</td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            IronFlow Gym Management &nbsp;•&nbsp; This is an automated message
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    console.log("==> Incoming Request Method:", req.method);

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    let payload: {
        to: string;
        subject?: string;
        body: string;
        category?: string;
        fromEmail?: string;
        fromName?: string;
        apiKey?: string; // Branch's SendGrid API key from Branch Settings
    };

    try {
        payload = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const { to, subject, body, category, fromEmail, fromName, apiKey } = payload;

    console.log(`==> Processing email to: ${to}, subject: ${subject}, category: ${category}`);

    // ✅ Use API key from Branch Settings → Email Infrastructure (SendGrid API Key field)
    // Falls back to Supabase secret SENDGRID_API_KEY if not provided by the branch
    const SENDGRID_API_KEY = apiKey || Deno.env.get('SENDGRID_API_KEY');

    if (!SENDGRID_API_KEY) {
        console.error("==> SENDGRID_API_KEY is missing! Cannot send email.");
        return new Response(
            JSON.stringify({ error: 'No SendGrid API key. Add it in Branch Settings → Email Infrastructure.' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }

    if (!to || !body) {
        return new Response(JSON.stringify({ error: 'Missing required fields: to, body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    if (!to.includes('@')) {
        return new Response(JSON.stringify({ error: 'Recipient is not a valid email address' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const cat = category || 'ANNOUNCEMENT';
    const sgPayload = {
        personalizations: [{ to: [{ email: to }] }],
        from: {
            email: fromEmail || 'noreply@ironflow.app',
            name: fromName || 'IronFlow Gym',
        },
        subject: subject || 'IronFlow Notification',
        content: [
            { type: 'text/plain', value: body },
            { type: 'text/html', value: buildHtml(body, cat) },
        ],
    };

    try {
        const sgRes = await fetch(SENDGRID_API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sgPayload),
        });

        console.log("==> SendGrid Response Status:", sgRes.status);

        if (sgRes.ok || sgRes.status === 202) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        const errText = await sgRes.text();
        console.error("==> SendGrid Error:", errText);
        return new Response(JSON.stringify({ error: `SendGrid error ${sgRes.status}`, detail: errText }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("==> Exception Caught:", message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
});
