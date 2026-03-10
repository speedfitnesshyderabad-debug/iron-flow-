-- Add is_read column to communications table
ALTER TABLE communications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add index for performance on filtering by user and read status
CREATE INDEX IF NOT EXISTS idx_communications_user_read ON communications("userId", is_read);
