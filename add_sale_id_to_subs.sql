-- ============================================================
-- TITAN GYM SOFTWARE - ULTIMATE DATA REPAIR (v4.2 - Final)
-- ============================================================

-- 1. STRUCTURAL PREP
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- 2. ID NORMALIZATION: Convert Human-Readable IDs to UUIDs
-- This ensures that both legacy records (IF-IND-xxx) and new records (UUID)
-- use the same Supabase UUID for linking and RLS filtering.
UPDATE public.sales s
SET "memberId" = u.id
FROM public.users u
WHERE s."memberId" = u."memberId"
  AND s."memberId" IS NOT NULL
  AND s."memberId" != u.id;

UPDATE public.subscriptions s
SET "memberId" = u.id
FROM public.users u
WHERE s."memberId" = u."memberId"
  AND s."memberId" IS NOT NULL
  AND s."memberId" != u.id;

-- 3. DEEP DATA RESTORATION: Restore Branch IDs using Member Ownership
UPDATE public.sales s
SET "branchId" = u."branchId"
FROM public.users u
WHERE s."memberId" = u.id
  AND (s."branchId" IS NULL OR s."branchId" = '');

UPDATE public.subscriptions s
SET "branchId" = u."branchId"
FROM public.users u
WHERE s."memberId" = u.id
  AND (s."branchId" IS NULL OR s."branchId" = '');

UPDATE public.attendance a
SET "branchId" = u."branchId"
FROM public.users u
WHERE a."userId" = u.id
  AND (a."branchId" IS NULL OR a."branchId" = '');

-- 4. SMART LINKING: Re-link Subscriptions to Sales (Fuzzy)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND (sa.date::date = s."startDate"::date)
  AND s."saleId" IS NULL;

UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- 5. MEMBER-CENTRIC RLS POLICIES (Explicit Definitions)
-- ENSURES visibility based on member relationship to the branch.

-- SALES
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.sales;
CREATE POLICY "Branch Data Isolation" ON public.sales
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.sales."memberId" AND "branchId" = get_user_branch())
);

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.subscriptions;
CREATE POLICY "Branch Data Isolation" ON public.subscriptions
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.subscriptions."memberId" AND "branchId" = get_user_branch())
);

-- ATTENDANCE
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.attendance;
CREATE POLICY "Branch Data Isolation" ON public.attendance
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.attendance."userId" AND "branchId" = get_user_branch())
);

-- BOOKINGS
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.bookings;
CREATE POLICY "Branch Data Isolation" ON public.bookings
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.bookings."memberId" AND "branchId" = get_user_branch())
);

-- METRICS
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.metrics;
CREATE POLICY "Branch Data Isolation" ON public.metrics
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.metrics."memberId" AND "branchId" = get_user_branch())
);
