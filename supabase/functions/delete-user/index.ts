// @ts-nocheck — This file runs on Supabase Deno runtime, not Node.js
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
            status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    let payload: { userId?: string, email?: string };
    try {
        payload = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    const { userId, email } = payload;
    if (!userId && !email) {
        return new Response(JSON.stringify({ error: 'Missing userId or email' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    // Use Supabase Admin client — SUPABASE_SERVICE_ROLE_KEY is auto-injected by Supabase
    const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let targetUserId = userId;

    if (!targetUserId && email) {
        // Find user by email (handling pagination to bypass 50 user limit)
        let page = 1;
        let foundUser = null;
        let hasMore = true;

        while (hasMore && !foundUser) {
            const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
            if (listError) {
                return new Response(JSON.stringify({ error: 'Failed to list users' }), {
                    status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }
            if (!users || users.length === 0) {
                hasMore = false;
            } else {
                foundUser = users.find(u => u.email === email);
                if (foundUser || users.length < 1000) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
        }

        if (foundUser) {
            targetUserId = foundUser.id;
        } else {
            return new Response(JSON.stringify({ success: true, note: 'Auth user not found by email, skipped' }), {
                status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
    }

    // Delete from Supabase Auth (this requires service role)
    const { error } = await adminClient.auth.admin.deleteUser(targetUserId!);

    if (error) {
        // If user doesn't exist in Auth, that's fine — not a real error
        if (error.message?.includes('not found') || error.status === 404) {
            return new Response(JSON.stringify({ success: true, note: 'Auth user not found, skipped' }), {
                status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
});
