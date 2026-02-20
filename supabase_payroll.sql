-- 1. Create payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "staffId" text REFERENCES users(id),
  "branchId" text REFERENCES branches(id),
  month text NOT NULL, -- e.g. "January"
  year integer NOT NULL,
  "baseSalary" numeric DEFAULT 0,
  "payableDays" numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  "commissionAmount" numeric DEFAULT 0,
  "netSalary" numeric DEFAULT 0,
  status text DEFAULT 'GENERATED', -- 'GENERATED', 'PAID'
  "generatedAt" timestamptz DEFAULT now(),
  "paidAt" timestamptz,
  details jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public All Payroll" ON payroll FOR ALL USING (true);

-- 2. Update users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "monthlySalary" numeric DEFAULT 15000;

-- 3. Update attendance table for Manual Overrides
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS notes text;
