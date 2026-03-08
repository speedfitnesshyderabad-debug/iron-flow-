-- Add settlement_rate column to branches table with a default value of 100
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS settlement_rate numeric DEFAULT 100;

-- Optional: Update any existing null values to the new default
UPDATE public.branches 
SET settlement_rate = 100 
WHERE settlement_rate IS NULL;
