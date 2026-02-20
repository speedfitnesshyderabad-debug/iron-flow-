-- ==========================================
-- 1. Fix 'active_sessions' 403 Error
-- ==========================================
-- Ensure table exists
CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  browser_info text,
  ip_address text,
  login_time timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Users can view their own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON active_sessions;

-- Re-create Policies (using ::text cast for safety)
CREATE POLICY "Users can view their own sessions" ON active_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own sessions" ON active_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own sessions" ON active_sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own sessions" ON active_sessions
  FOR DELETE USING (auth.uid()::text = user_id);


-- ==========================================
-- 2. Fix 'users' 400 Error (Missing Columns)
-- ==========================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "monthlySalary" numeric DEFAULT 15000,
ADD COLUMN IF NOT EXISTS "maxDevices" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "weekOffs" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "phone" TEXT;  -- Added Phone Number


-- ==========================================
-- 3. Fix 'attendance' (Missing Notes)
-- ==========================================
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS notes text;


-- ==========================================
-- 4. Ensure Payroll Table Exists
-- ==========================================
CREATE TABLE IF NOT EXISTS payroll (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "staffId" text REFERENCES users(id),
  "branchId" text REFERENCES branches(id),
  month text NOT NULL,
  year integer NOT NULL,
  "baseSalary" numeric DEFAULT 0,
  "payableDays" numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  "commissionAmount" numeric DEFAULT 0,
  "netSalary" numeric DEFAULT 0,
  status text DEFAULT 'GENERATED',
  "generatedAt" timestamptz DEFAULT now(),
  "paidAt" timestamptz,
  details jsonb DEFAULT '{}'
);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public All Payroll" ON payroll;
CREATE POLICY "Public All Payroll" ON payroll FOR ALL USING (true);
