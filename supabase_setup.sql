-- 1. Add GPS fields to 'branches' table
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS latitude float8,
ADD COLUMN IF NOT EXISTS longitude float8,
ADD COLUMN IF NOT EXISTS "geofenceRadius" float8 DEFAULT 0.2;

-- 2. Create 'transaction_codes' table for PIN Verification
CREATE TABLE IF NOT EXISTS transaction_codes (
    code text PRIMARY KEY,
    "branchId" text,
    status text, -- 'VALID', 'USED'
    "generatedBy" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 3. (Optional) Example: Update a branch with coordinates
-- UPDATE branches 
-- SET latitude = 12.9716, longitude = 77.5946, "geofenceRadius" = 0.2
-- WHERE id = 'YOUR_BRANCH_ID';
