export const config = {
    runtime: 'edge',
};

const SUPABASE_URL = "https://qnjpjknhobauyfqjyjcr.supabase.co";

const BLOCKED_HEADERS = new Set([
    "host", "cf-connecting-ip", "cf-ipcountry", "cf-ray",
    "cf-visitor", "x-forwarded-for", "x-vercel-forwarded-for",
    "x-vercel-ip-country", "x-real-ip"
]);

export default async function handler(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
        const url = new URL(request.url);

        // Reconstruct the path (strip /api/proxy prefix if present)
        let pathname = url.pathname;
        if (pathname.startsWith("/api/proxy")) {
            pathname = pathname.slice("/api/proxy".length) || "/";
        }

        const targetUrl = new URL(pathname + url.search, SUPABASE_URL);

        // Build clean headers
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

        const response = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: cleanHeaders,
            body,
        });

        const responseHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders())) {
            responseHeaders.set(key, value);
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

    } catch (err) {
        return new Response(
            JSON.stringify({ error: "Proxy error: " + err.message }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } }
        );
    }
}

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer, range, accept-profile, content-profile",
        "Access-Control-Max-Age": "86400",
    };
}
