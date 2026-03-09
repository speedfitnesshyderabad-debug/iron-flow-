-- ============================================================
-- TITAN GYM SOFTWARE - ULTIMATE DATA REPAIR (v4 - Dual ID Support)
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

-- 4. SMART LINKING: Re-link Subscriptions to Sales (Fuzzy)
-- Priority 1: Exact Match (Member + Plan + Date)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND (sa.date::date = s."startDate"::date)
  AND s."saleId" IS NULL;

-- Priority 2: Fuzzy Date Match (±48 hours)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- Priority 3: Loose Fallback (Member + Date ±48h)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- 5. MEMBER-CENTRIC RLS POLICIES
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
