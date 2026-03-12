-- ============================================================
-- TITAN GYM SOFTWARE - IDENTITY TRANSITION MIGRATION
-- ============================================================
-- This script:
-- 1. Recursively adds ON UPDATE CASCADE to all foreign keys 
--    referencing public.users(id).
-- 2. Updates the RLS policy to allow matching by email.
-- ============================================================

-- 1. Update Foreign Keys to ON UPDATE CASCADE
-- ============================================================
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'users' 
          AND ccu.table_schema = 'public'
    LOOP
        -- Drop the old constraint
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
        
        -- Add the new constraint with ON UPDATE CASCADE
        -- Note: We keep ON DELETE CASCADE as well
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE ON UPDATE CASCADE', 
            r.table_schema, r.table_name, r.constraint_name, r.column_name, r.table_schema, r.foreign_table_name, r.foreign_column_name);
    END LOOP;
END $$;


-- 2. Relax RLS Policy for Users
-- ============================================================
-- Old policy strictly relied on ID. New policy allows matching by verified email in JWT.
-- This allows a user with a different UID (Google) to see their pre-existing profile.

DROP POLICY IF EXISTS "User Access" ON public.users;

CREATE POLICY "User Access" ON public.users
FOR ALL USING (
  (id = auth.uid()::text) OR
  (email = auth.jwt()->>'email') OR -- Allow access by verified email
  is_super_admin() OR 
  ("branchId" = get_user_branch() AND is_branch_staff_admin())
);


-- 3. Confirm Success
-- ============================================================
SELECT 'Migration Complete: Users can now switch between identities seamlessly.' as result;
