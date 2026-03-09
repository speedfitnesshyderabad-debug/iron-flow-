-- Migration: Add saleId to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- Update existing records using the heuristic (optional, but good for data consistency)
-- This tries to link previous subscriptions to sales by matching memberId, planId, and date
UPDATE public.subscriptions s
SET "saleId" = sa.id
FROM public.sales sa
WHERE s."memberId" = sa."memberId"
  AND s."planId" = sa."planId"
  AND s."startDate" = sa.date
  AND s."saleId" IS NULL;
