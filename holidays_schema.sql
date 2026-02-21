-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  date date NOT NULL,
  message text,
  "branchId" text REFERENCES branches(id) ON DELETE CASCADE,
  "createdAt" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public All Holidays" ON holidays FOR ALL USING (true);
