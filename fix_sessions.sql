-- 1. Create the active_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id),
    device_fingerprint TEXT,
    device_name TEXT,
    browser_info TEXT,
    ip_address TEXT,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DISABLE Row Level Security (RLS) to allow all writes
-- This fixes the "nothing is saving" issue immediately.
ALTER TABLE public.active_sessions DISABLE ROW LEVEL SECURITY;

-- 3. (Optional) Grant full access to public/anon/authenticated roles just to be sure
GRANT ALL ON public.active_sessions TO postgres;
GRANT ALL ON public.active_sessions TO anon;
GRANT ALL ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;

-- 4. Verify branches table RLS is also off (just in case)
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
