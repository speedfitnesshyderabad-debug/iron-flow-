-- Migration: Robust Sale-Subscription Linking
-- This version uses a 3-day window to catch records with timezone/manual adjustments

UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND ABS(EXTRACT(EPOCH FROM (s."startDate"::timestamp - sa.date::timestamp))) <= 172800 -- 48 hour window
  AND s."saleId" IS NULL;

-- Secondary pass: link by member only if it's the only sale on that day for that member
-- (Matches records where planId might be missing in the sales record)
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."saleId" IS NULL
  AND sa.date = s."startDate"
  AND (
    SELECT COUNT(*) 
    FROM public.sales s2 
    WHERE s2."memberId" = s."memberId" AND s2.date = s."startDate"
  ) = 1;
