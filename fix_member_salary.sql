-- Fix for monthlySalary being added to members by default
-- 1. Remove the default value from the users table
ALTER TABLE public.users ALTER COLUMN "monthlySalary" DROP DEFAULT;

-- 2. Clean up existing members - set their salary to 0
UPDATE public.users SET "monthlySalary" = 0 WHERE role = 'MEMBER';
