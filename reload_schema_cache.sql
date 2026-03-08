-- Run this command in your Supabase SQL Editor to force the PostgREST server to refresh its schema cache.
-- This is often required when you add or modify a column (like "isActive" or "active") to a table, 
-- and your application throws a "schema cache" error.

NOTIFY pgrst, 'reload schema';

-- Note:
-- If your column was created as "isActive" (with quotes), make sure your frontend code 
-- requests it exactly as "isActive" (case-sensitive) and not "active".
