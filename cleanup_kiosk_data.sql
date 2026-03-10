-- CLEANUP KIOSK USER DATA
-- This script zeroes out salary, commissions and shifts for Kiosk users
-- so they don't appear in financial reports incorrectly.

UPDATE public.users
SET 
    "monthlySalary" = 0,
    "commissionPercentage" = 0,
    "salesCommissionPercentage" = 0,
    "ptCommissionPercentage" = 0,
    "groupCommissionPercentage" = 0,
    shifts = '[]'::jsonb,
    "weekOffs" = '{}'::text[]
WHERE role = 'KIOSK';

-- Verify the cleanup
SELECT name, email, role, "monthlySalary" 
FROM public.users 
WHERE role = 'KIOSK';
