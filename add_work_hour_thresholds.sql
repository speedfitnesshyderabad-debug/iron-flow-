-- Add configurable work hour thresholds for salary calculation
-- Execute this in the Supabase SQL Editor

-- 1. Add fullDayHours column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS "fullDayHours" NUMERIC DEFAULT 8;

-- 2. Add halfDayHours column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS "halfDayHours" NUMERIC DEFAULT 4;

-- 3. Comment for clarity
COMMENT ON COLUMN public.users."fullDayHours" IS 'Hours needed to count as a full paid day (default 8)';
COMMENT ON COLUMN public.users."halfDayHours" IS 'Hours needed to count as a half paid day (default 4)';
