export const config = {
    runtime: 'edge',
};

const SUPABASE_URL = "https://qnjpjknhobauyfqjyjcr.supabase.co";

const SKIP_HEADERS = new Set([
    "host", "x-forwarded-for", "x-vercel-forwarded-for",
    "x-vercel-ip-country", "x-real-ip", "x-vercel-deployment-url",
]);

export default async function handler(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
    }

    try {
        const url = new URL(request.url);

        // Strip the /api prefix that Vercel adds, forward the rest to Supabase
        const supabasePath = url.pathname.replace(/^\/api/, "") || "/";
        const targetUrl = SUPABASE_URL + supabasePath + url.search;

        // Clean headers
        const headers = new Headers();
        for (const [k, v] of request.headers.entries()) {
            if (!SKIP_HEADERS.has(k.toLowerCase())) headers.set(k, v);
        }

        const body = ["GET", "HEAD"].includes(request.method)
            ? null
            : await request.arrayBuffer();

        const res = await fetch(targetUrl, {
            method: request.method,
            headers,
            body,
        });

        const resHeaders = new Headers(res.headers);
        for (const [k, v] of Object.entries(cors())) resHeaders.set(k, v);

        return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: resHeaders,
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...cors() },
        });
    }
}

function cors() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
            "authorization,x-client-info,apikey,content-type,x-supabase-api-version,prefer,range,accept-profile,content-profile",
        "Access-Control-Max-Age": "86400",
    };
}
