-- ============================================================
-- TITAN GYM SOFTWARE - POWER DATA & ACCESS REPAIR (v3)
-- ============================================================

-- 1. STRUCTURAL PREP
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- 2. DEEP DATA RESTORATION: Restore Branch IDs using Member Ownership
-- This fixes historical records that were "orphaned" during branch migrations or missing data.
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

-- 3. SMART LINKING: Re-link Subscriptions to Sales
-- Priority 1: Exact Match (Member + Plan + Date)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND sa.date = s."startDate"
  AND s."saleId" IS NULL;

-- Priority 2: Fuzzy Date Match (±48 hours)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- Priority 3: Member + Date Match (Fallback if plan name/ID changed)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND sa.date = s."startDate"
  AND s."saleId" IS NULL;

-- 4. MEMBER-CENTRIC RLS POLICIES
-- This ensures branch admins can see ANY record belonging to a member in their branch,
-- even if the record itself has a different branchId (cross-branch history).

DO $$ 
DECLARE 
    tbl text;
    tables_to_repair text[] := ARRAY['sales', 'subscriptions', 'attendance', 'bookings', 'metrics'];
BEGIN
    FOREACH tbl IN ARRAY tables_to_repair
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Branch Data Isolation" ON public.%I', tbl);
        EXECUTE format('
            CREATE POLICY "Branch Data Isolation" ON public.%I
            FOR ALL USING (
                is_super_admin() OR 
                "branchId" = get_user_branch() OR
                (SELECT "branchId" FROM public.users WHERE id = public.%I."memberId") = get_user_branch() OR
                (SELECT "branchId" FROM public.users WHERE id = public.%I."userId") = get_user_branch()
            )', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;
