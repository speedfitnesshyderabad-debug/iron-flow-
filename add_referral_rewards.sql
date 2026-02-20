-- 1. Add referralCode to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referralCode" TEXT UNIQUE;

-- 2. Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "referrerId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "refereeId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "planBoughtId" TEXT REFERENCES plans(id),
  "rewardDaysApplied" INTEGER DEFAULT 0,
  "status" TEXT DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Referrers can view their referrals" ON referrals;
CREATE POLICY "Referrers can view their referrals" ON referrals
  FOR SELECT USING (auth.uid()::text = "referrerId");

DROP POLICY IF EXISTS "Public All Referrals" ON referrals;
CREATE POLICY "Public All Referrals" ON referrals
  FOR ALL USING (true); -- Open for development, similar to other tables

-- 5. Function to generate referral code (Simple version for now)
-- In a real app, this might be a trigger or handled in the app context.
-- We'll initialize existing users with a code via a script if needed.
