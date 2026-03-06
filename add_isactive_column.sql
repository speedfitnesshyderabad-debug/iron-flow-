-- Add isActive column for disabling staff logins
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

-- Update existing users to be active by default
UPDATE public.users SET "isActive" = TRUE WHERE "isActive" IS NULL;
