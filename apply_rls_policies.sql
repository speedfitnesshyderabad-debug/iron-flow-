-- ============================================================
-- TITAN GYM SOFTWARE - RLS POLICIES FOR BRANCH ISOLATION (FIXED)
-- ============================================================
-- This version FIXES the "infinite recursion" error in the users table.
-- ============================================================

-- 1. SECURITY HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- ============================================================

-- Function to check if the current user is a SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get the current user's branchId
CREATE OR REPLACE FUNCTION public.get_user_branch()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT "branchId"
    FROM public.users
    WHERE id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if the current user has an administrative role in their branch
CREATE OR REPLACE FUNCTION public.is_branch_staff_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role IN ('BRANCH_ADMIN', 'MANAGER', 'RECEPTIONIST')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. CLEANUP EXISTING POLICIES
-- ============================================================
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- 3. APPLY POLICIES (Refined to avoid recursion)
-- ============================================================

-- A. BRANCHES (Public Discovery)
-- ------------------------------------------------------------
CREATE POLICY "Public Branch Discovery" ON public.branches
FOR SELECT USING (NOT "isHidden" OR is_super_admin());

CREATE POLICY "Branch Management" ON public.branches
FOR ALL USING (
  is_super_admin() OR id = get_user_branch()
);

-- B. USERS (Fixed to avoid recursion)
-- ------------------------------------------------------------
-- Everyone can see their own record.
-- Admins/Managers can see everyone in their branch.
-- IMPORTANT: is_super_admin() and is_branch_staff_admin() are SECURITY DEFINER 
-- so they bypass this policy and don't cause recursion.
CREATE POLICY "User Access" ON public.users
FOR ALL USING (
  (id = auth.uid()::text) OR
  is_super_admin() OR 
  ("branchId" = get_user_branch() AND is_branch_staff_admin())
);

-- C. GENERAL DATA TABLES (Strict Isolation)
-- ------------------------------------------------------------
DO $$ 
DECLARE 
    tbl text;
    tables_to_isolate text[] := ARRAY[
        'plans', 'subscriptions', 'sales', 'attendance', 'bookings', 
        'feedback', 'inventory', 'offers', 'communications', 
        'class_templates', 'class_schedules', 'expenses', 
        'transaction_codes', 'walk_ins', 'class_completion_codes',
        'payroll', 'holidays', 'coupons'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_isolate
    LOOP
        EXECUTE format('
            CREATE POLICY "Branch Data Isolation" ON public.%I
            FOR ALL USING (
                is_super_admin() OR "branchId" = get_user_branch()
            )', tbl);
    END LOOP;
END $$;


-- D. SPECIALIZED TABLES
-- ------------------------------------------------------------
CREATE POLICY "Metrics Access" ON public.metrics
FOR ALL USING (
  is_super_admin() OR 
  "memberId" = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = public.metrics."memberId" 
    AND "branchId" = get_user_branch()
  )
);

CREATE POLICY "Sessions Access" ON public.active_sessions
FOR ALL USING (
  is_super_admin() OR user_id = auth.uid()::text
);

CREATE POLICY "Referrals Access" ON public.referrals
FOR ALL USING (
  is_super_admin() OR 
  "referrerId" = auth.uid()::text OR
  "refereeId" = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = public.referrals."referrerId" 
    AND "branchId" = get_user_branch()
  )
);
