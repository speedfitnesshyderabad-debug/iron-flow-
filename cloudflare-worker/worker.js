/**
 * Cloudflare Worker: Supabase Proxy
 * Proxies all Supabase requests to bypass India ISP blocks.
 */

const SUPABASE_URL = "https://qnjpjknhobauyfqjyjcr.supabase.co";

// Headers that must NOT be forwarded to Supabase
const BLOCKED_HEADERS = new Set([
    "host",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
    "cf-worker",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
]);

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
            const targetUrl = new URL(url.pathname + url.search, SUPABASE_URL);

            // Build clean headers — strip Cloudflare/browser-specific headers
            const cleanHeaders = new Headers();
            for (const [key, value] of request.headers.entries()) {
                if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
                    cleanHeaders.set(key, value);
                }
            }

            // Read body safely
            let body = null;
            if (!["GET", "HEAD"].includes(request.method)) {
                body = await request.arrayBuffer();
            }

            const supabaseResponse = await fetch(targetUrl.toString(), {
                method: request.method,
                headers: cleanHeaders,
                body: body,
                redirect: "follow",
            });

            // Clone response and add CORS headers
            const responseHeaders = new Headers(supabaseResponse.headers);
            for (const [key, value] of Object.entries(corsHeaders())) {
                responseHeaders.set(key, value);
            }

            return new Response(supabaseResponse.body, {
                status: supabaseResponse.status,
                statusText: supabaseResponse.statusText,
                headers: responseHeaders,
            });

        } catch (err) {
            return new Response(
                JSON.stringify({ error: "Proxy error: " + err.message }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders(),
                    },
                }
            );
        }
    },
};

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer, range, accept-profile, content-profile",
        "Access-Control-Max-Age": "86400",
    };
}
