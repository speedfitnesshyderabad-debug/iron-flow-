-- ============================================================
-- TITAN GYM SOFTWARE - COMPREHENSIVE DATA & ACCESS REPAIR
-- ============================================================

-- 1. ADD COLUMN
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- 2. DATA RESTORATION: Fill in missing Branch IDs in Sales/Subscriptions
-- (Some historical records might have NULL branchId)
UPDATE public.sales s
SET "branchId" = u."branchId"
FROM public.users u
WHERE s."memberId" = u.id
  AND s."branchId" IS NULL;

UPDATE public.subscriptions s
SET "branchId" = u."branchId"
FROM public.users u
WHERE s."memberId" = u.id
  AND s."branchId" IS NULL;

-- 3. STRUCTURAL LINKING: Link Subscriptions to Sales
-- Catching records within a 48h window for timezone safety
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- 4. RLS FIX: Fix Visibility for Branch Admins
-- The previous policy blocked records with NULL branchId. 
-- This new policy allows admins to see any record belonging to a member of their branch.

DROP POLICY IF EXISTS "Branch Data Isolation" ON public.sales;
CREATE POLICY "Branch Data Isolation" ON public.sales
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    "memberId" IN (SELECT id FROM public.users WHERE "branchId" = get_user_branch())
);

DROP POLICY IF EXISTS "Branch Data Isolation" ON public.subscriptions;
CREATE POLICY "Branch Data Isolation" ON public.subscriptions
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    "memberId" IN (SELECT id FROM public.users WHERE "branchId" = get_user_branch())
);

-- Apply the same logic to other isolated tables if needed, 
-- but Sales and Subscriptions are the priority for the Profile.
