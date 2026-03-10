-- ============================================================
-- TITAN GYM SOFTWARE - DATABASE OPTIMIZATION (v1.0)
-- ============================================================
-- Purpose: Speed up server-side searching and pagination for the member dashboard.
-- Targets: 'users' table columns used in 'ilike' and 'eq' filters.

-- 1. EXTENSION PREP (Required for advanced searching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. SCHEMA FIX: Add missing 'createdAt' column to 'users' table if it doesn't exist
-- (Required for pagination sorting in AppContext.tsx)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

-- 3. CREATE SEARCH INDEXES
-- Using GIN (Generalized Inverted Index) with gin_trgm_ops for lightning-fast 'ilike' (fuzzy) searching.

-- Index for User Name
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin (name gin_trgm_ops);

-- Index for Phone Number (Partial matches)
CREATE INDEX IF NOT EXISTS idx_users_phone_trgm ON public.users USING gin (phone gin_trgm_ops);

-- Index for Member ID (String ID like 'IF-IND-1234')
CREATE INDEX IF NOT EXISTS idx_users_memberid_trgm ON public.users USING gin ("memberId" gin_trgm_ops);

-- 4. CREATE FILTER INDEXES
-- Using standard B-Tree for exact match filtering (Branch & Role).

-- Index for Branch Filtering
CREATE INDEX IF NOT EXISTS idx_users_branchid ON public.users ("branchId");

-- Index for Role Filtering (Almost always 'MEMBER' in the dashboard)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

-- Index for Creation Date (Pagination sorting)
CREATE INDEX IF NOT EXISTS idx_users_createdat ON public.users ("createdAt" DESC);

-- 5. VERIFY
-- Analyze tables to update statistics for the query planner
ANALYZE public.users;

-- ============================================================
-- OPTIMIZATION COMPLETE
-- ============================================================
