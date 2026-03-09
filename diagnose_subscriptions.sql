-- RUN THIS IN SUPABASE SQL EDITOR TO DIAGNOSE THE MISMATCH

-- 1. Look for members whose name matches the ones you see in the UI
SELECT id AS user_uuid, name, email FROM public.users WHERE name ILIKE '%Vinay%' OR name ILIKE '%Manoj%';

-- 2. See what users are ACTUALLY attached to the subscriptions matching your plans
SELECT 
    s.id AS sub_id, 
    s."memberId" AS sub_member_uuid, 
    u.name AS attached_user_name,
    s.status 
FROM public.subscriptions s
LEFT JOIN public.users u ON s."memberId" = u.id;
