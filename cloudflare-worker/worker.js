/**
 * Cloudflare Worker: Supabase Proxy
 * 
 * This worker proxies all requests to your Supabase project,
 * allowing Indian users to bypass ISP-level blocks on supabase.co
 * 
 * Deploy this at: https://workers.cloudflare.com
 */

const SUPABASE_URL = "https://qnjpjknhobauyfqjyjcr.supabase.co";

export default {
    async fetch(request) {
        // Handle CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(),
            });
        }

        try {
            const url = new URL(request.url);

            // Build the target Supabase URL
            const targetUrl = new URL(url.pathname + url.search, SUPABASE_URL);

            // Forward the request to Supabase
            const supabaseRequest = new Request(targetUrl, {
                method: request.method,
                headers: request.headers,
                body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
                redirect: "follow",
            });

            const response = await fetch(supabaseRequest);

            // Add CORS headers to the response
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders()).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders() },
            });
        }
    },
};

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer, range",
    };
}
