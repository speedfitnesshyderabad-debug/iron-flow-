-- ============================================================
-- FIX: In-App Notification System
-- ============================================================
-- 1. Ensure the is_read column exists in communications
ALTER TABLE public.communications 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 2. Add an index for faster notification fetching
CREATE INDEX IF NOT EXISTS idx_communications_user_read 
ON public.communications ("userId", is_read);

-- 3. (Optional) Create a test notification for the first user found (to verify)
DO $$
DECLARE
    target_user_id TEXT;
BEGIN
    SELECT id INTO target_user_id FROM public.users LIMIT 1;
    
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.communications (
            id, "userId", type, recipient, subject, body, status, category, "branchId", is_read
        ) VALUES (
            'fix-test-' || gen_random_uuid(),
            target_user_id,
            'SMS',
            'system',
            '🛠 Notification System Fixed',
            'Success! Your in-app notification system is now correctly tracking read/unread status.',
            'DELIVERED',
            'ANNOUNCEMENT',
            (SELECT id FROM public.branches LIMIT 1),
            FALSE
        );
    END IF;
END $$;
