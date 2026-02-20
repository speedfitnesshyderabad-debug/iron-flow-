-- Add membership pause related columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "pauseStartDate" DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "pauseAllowanceDays" INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS "pausedDaysUsed" INTEGER DEFAULT 0;
