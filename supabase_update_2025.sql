-- 1. Create active_sessions table
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

-- Enable RLS for active_sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for active_sessions (Modify as needed for security)
-- Allow users to view their own sessions
CREATE POLICY "Users can view their own sessions" ON active_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

-- Allow users to insert their *own* session record? 
-- Actually, the app logic might insert for any user if admin creates user?
-- But wait, active_sessions usually implies the currently logged in user.
-- If backend logic inserts it, we need appropriate policy.
-- For now, open for authenticated users, but ideally restricted.
CREATE POLICY "Users can insert their own sessions" ON active_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own sessions" ON active_sessions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own sessions" ON active_sessions
  FOR DELETE USING (auth.uid()::text = user_id);


-- 2. Add columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "maxDevices" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "weekOffs" TEXT[] DEFAULT '{}';


-- 3. Add columns to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS "transactionCode" TEXT,
ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;
