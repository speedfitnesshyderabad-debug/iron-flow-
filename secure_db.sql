-- 1. Enable RLS on all key tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES

-- USERS Table
-- Allow anyone to read users (needed for Login/Setup to find email matches)
-- In a stricter app, we'd limit this, but for now we need it for the frontend 'users' context
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
-- Only Super Admin or the user themselves can update
CREATE POLICY "Allow update own user or admin" ON public.users FOR UPDATE USING (
  auth.uid()::text = id OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'SUPER_ADMIN')
);

-- BRANCHES Table
-- Public read (for Check-In page, Login page info)
CREATE POLICY "Allow public read branches" ON public.branches FOR SELECT USING (true);
-- Only Admins can modify
CREATE POLICY "Allow admin modify branches" ON public.branches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('SUPER_ADMIN', 'BRANCH_ADMIN'))
);

-- PLANS Table
-- Public read (for Pricing page)
CREATE POLICY "Allow public read plans" ON public.plans FOR SELECT USING (true);

-- ACTIVE_SESSIONS Table
-- Allow all access (handled by AppContext logic + creating sessions on login)
CREATE POLICY "Allow all session access" ON public.active_sessions FOR ALL USING (true);

-- ATTENDANCE / SUBSCRIPTIONS / SALES
-- Authenticated users can read
CREATE POLICY "Allow auth read operational" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth read subs" ON public.subscriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);

-- Allow Staff/Admins to insert/update
CREATE POLICY "Allow staff write operational" ON public.attendance FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role IN ('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER', 'STAFF', 'TRAINER'))
);
