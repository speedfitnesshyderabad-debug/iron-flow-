-- ============================================================
-- TITAN GYM SOFTWARE - ULTIMATE DATA REPAIR (v4.3 - Targeted)
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
-- We target ONLY sales and subscriptions first to ensure the Profile works.
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

-- 5. TARGETED RLS REPAIR (Only essential tables)
-- This ensures branch admins can see ANY record belonging to a member in their branch.

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
