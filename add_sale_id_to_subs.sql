-- ============================================================
-- TITAN GYM SOFTWARE - ULTIMATE DATA REPAIR (v4.1 - Fixed)
-- ============================================================

-- 1. STRUCTURAL PREP
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- 2. ID NORMALIZATION: Convert Human-Readable IDs to UUIDs
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

UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 
  AND s."saleId" IS NULL;

-- 5. MEMBER-CENTRIC RLS POLICIES (Fixed Column Mappings)
DO $$ 
DECLARE 
    tbl text;
    col text;
    tables_to_repair text[][] := ARRAY[
        ARRAY['sales', 'memberId'], 
        ARRAY['subscriptions', 'memberId'], 
        ARRAY['bookings', 'memberId'], 
        ARRAY['metrics', 'memberId'],
        ARRAY['attendance', 'userId']
    ];
BEGIN
    FOR i IN 1..array_length(tables_to_repair, 1)
    LOOP
        tbl := tables_to_repair[i][1];
        col := tables_to_repair[i][2];
        
        EXECUTE format('DROP POLICY IF EXISTS "Branch Data Isolation" ON public.%I', tbl);
        EXECUTE format('
            CREATE POLICY "Branch Data Isolation" ON public.%I
            FOR ALL USING (
                is_super_admin() OR 
                "branchId" = get_user_branch() OR
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = public.%I.%I 
                    AND "branchId" = get_user_branch()
                )
            )', tbl, tbl, tbl, col);
    END LOOP;
END $$;
