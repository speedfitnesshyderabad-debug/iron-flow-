-- Add isHidden column to branches table
ALTER TABLE branches ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT FALSE;
