-- ============================================================
-- TITAN GYM SOFTWARE - MASTER SCHEMA REBUILD
-- ============================================================
-- Run this in the Supabase SQL Editor on a fresh/empty database.
-- This file is SAFE: it uses CREATE TABLE IF NOT EXISTS and
-- ADD COLUMN IF NOT EXISTS — it will NOT drop any existing data.
-- ============================================================

-- 0. Enable Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- SECTION 1: CORE TABLES
-- (Order matters: parent tables before child tables)
-- ============================================================

-- BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  gstin TEXT,
  "gstPercentage" NUMERIC DEFAULT 18,
  "gateWebhookUrl" TEXT,
  "paymentProvider" TEXT,
  "paymentApiKey" TEXT,
  "paymentMerchantId" TEXT,
  "emailProvider" TEXT,
  "emailApiKey" TEXT,
  "emailFromAddress" TEXT,
  "smsProvider" TEXT,
  "smsApiKey" TEXT,
  "smsSenderId" TEXT,
  equipment TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  "geofenceRadius" INTEGER DEFAULT 100,
  "isHidden" BOOLEAN DEFAULT FALSE,
  "termsAndConditions" TEXT
);

-- USERS
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  role TEXT NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  avatar TEXT,
  "memberId" TEXT,
  phone TEXT,
  address TEXT,
  "emergencyContact" TEXT,
  "hasAcceptedTerms" BOOLEAN DEFAULT FALSE,
  "hourlyRate" NUMERIC,
  "commissionPercentage" NUMERIC DEFAULT 0,
  "salesCommissionPercentage" NUMERIC DEFAULT 0,
  "ptCommissionPercentage" NUMERIC DEFAULT 0,
  "groupCommissionPercentage" NUMERIC DEFAULT 0,
  shifts JSONB,
  "weekOffs" TEXT[] DEFAULT '{}',
  "monthlySalary" NUMERIC,
  "maxDevices" INTEGER DEFAULT 1,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "referralCode" TEXT UNIQUE
);

-- PLANS
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "isMultiBranch" BOOLEAN DEFAULT FALSE,
  "maxSessions" INTEGER,
  "sessionDurationMinutes" INTEGER,
  "groupCapacity" INTEGER
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "planId" TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status TEXT NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "pauseStartDate" DATE,
  "pauseAllowanceDays" INTEGER DEFAULT 0,
  "pausedDaysUsed" INTEGER DEFAULT 0
);

-- SALES
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "planId" TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  "itemId" TEXT,
  "staffId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  "paymentMethod" TEXT NOT NULL,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "transactionCode" TEXT,
  "razorpayPaymentId" TEXT
);

-- ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  "timeIn" TIME NOT NULL,
  "timeOut" TIME,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  notes TEXT
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL
);

-- FEEDBACK
CREATE TABLE IF NOT EXISTS public.feedback (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  date DATE NOT NULL
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INTEGER NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE
);

-- METRICS (Body Metrics)
CREATE TABLE IF NOT EXISTS public.metrics (
  id TEXT PRIMARY KEY,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC,
  bmi NUMERIC
);

-- OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  "imageUrl" TEXT,
  "expiryDate" DATE,
  "branchId" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "ctaText" TEXT,
  "couponCode" TEXT
);

-- COMMUNICATIONS
CREATE TABLE IF NOT EXISTS public.communications (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL
);

-- CLASS TEMPLATES
CREATE TABLE IF NOT EXISTS public.class_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "dayOfWeek" TEXT NOT NULL,
  "timeSlot" TEXT NOT NULL,
  capacity INTEGER DEFAULT 20,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE
);

-- CLASS SCHEDULES
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id TEXT PRIMARY KEY,
  "templateId" TEXT REFERENCES public.class_templates(id) ON DELETE SET NULL,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  "timeSlot" TEXT NOT NULL,
  title TEXT NOT NULL,
  capacity INTEGER DEFAULT 20,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  "recordedBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL
);

-- TRANSACTION CODES
CREATE TABLE IF NOT EXISTS public.transaction_codes (
  code TEXT PRIMARY KEY,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  "generatedBy" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- WALK INS
CREATE TABLE IF NOT EXISTS public.walk_ins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  purpose TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  notes TEXT,
  "assignedTo" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "followUpDate" DATE,
  "convertedToMemberId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- CLASS COMPLETION CODES
CREATE TABLE IF NOT EXISTS public.class_completion_codes (
  id TEXT PRIMARY KEY,
  "bookingId" TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
  "trainerId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "memberId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'VALID',
  "classDate" DATE NOT NULL,
  "classType" TEXT NOT NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "usedAt" TIMESTAMPTZ
);


-- ============================================================
-- SECTION 2: EXTENSION TABLES
-- ============================================================

-- ACTIVE SESSIONS (Device / Login tracking)
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  browser_info TEXT,
  ip_address TEXT,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL
CREATE TABLE IF NOT EXISTS public.payroll (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "staffId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  "baseSalary" NUMERIC DEFAULT 0,
  "payableDays" NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  "commissionAmount" NUMERIC DEFAULT 0,
  "netSalary" NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'GENERATED',
  "generatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "paidAt" TIMESTAMPTZ,
  details JSONB DEFAULT '{}'
);

-- HOLIDAYS
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  message TEXT,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FIXED')),
  value NUMERIC NOT NULL,
  "minPurchase" NUMERIC DEFAULT 0,
  "maxDiscount" NUMERIC,
  "expiryDate" DATE,
  "usageLimit" INTEGER,
  "timesUsed" INTEGER DEFAULT 0,
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRALS
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  "referrerId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "refereeId" TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  "planBoughtId" TEXT REFERENCES public.plans(id) ON DELETE SET NULL,
  "rewardDaysApplied" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walk_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_completion_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 4: RLS POLICIES (Open access — app handles authorization)
-- Drop first to avoid "policy already exists" errors on re-run
-- ============================================================

-- BRANCHES
DROP POLICY IF EXISTS "Public All Branches" ON public.branches;
CREATE POLICY "Public All Branches" ON public.branches FOR ALL USING (true);

-- USERS
DROP POLICY IF EXISTS "Public All Users" ON public.users;
CREATE POLICY "Public All Users" ON public.users FOR ALL USING (true);

-- PLANS
DROP POLICY IF EXISTS "Public All Plans" ON public.plans;
CREATE POLICY "Public All Plans" ON public.plans FOR ALL USING (true);

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Public All Subscriptions" ON public.subscriptions;
CREATE POLICY "Public All Subscriptions" ON public.subscriptions FOR ALL USING (true);

-- SALES
DROP POLICY IF EXISTS "Public All Sales" ON public.sales;
CREATE POLICY "Public All Sales" ON public.sales FOR ALL USING (true);

-- ATTENDANCE
DROP POLICY IF EXISTS "Public All Attendance" ON public.attendance;
CREATE POLICY "Public All Attendance" ON public.attendance FOR ALL USING (true);

-- BOOKINGS
DROP POLICY IF EXISTS "Public All Bookings" ON public.bookings;
CREATE POLICY "Public All Bookings" ON public.bookings FOR ALL USING (true);

-- FEEDBACK
DROP POLICY IF EXISTS "Public All Feedback" ON public.feedback;
CREATE POLICY "Public All Feedback" ON public.feedback FOR ALL USING (true);

-- INVENTORY
DROP POLICY IF EXISTS "Public All Inventory" ON public.inventory;
CREATE POLICY "Public All Inventory" ON public.inventory FOR ALL USING (true);

-- METRICS
DROP POLICY IF EXISTS "Public All Metrics" ON public.metrics;
CREATE POLICY "Public All Metrics" ON public.metrics FOR ALL USING (true);

-- OFFERS
DROP POLICY IF EXISTS "Public All Offers" ON public.offers;
CREATE POLICY "Public All Offers" ON public.offers FOR ALL USING (true);

-- COMMUNICATIONS
DROP POLICY IF EXISTS "Public All Communications" ON public.communications;
CREATE POLICY "Public All Communications" ON public.communications FOR ALL USING (true);

-- CLASS TEMPLATES
DROP POLICY IF EXISTS "Public All Class Templates" ON public.class_templates;
CREATE POLICY "Public All Class Templates" ON public.class_templates FOR ALL USING (true);

-- CLASS SCHEDULES
DROP POLICY IF EXISTS "Public All Class Schedules" ON public.class_schedules;
CREATE POLICY "Public All Class Schedules" ON public.class_schedules FOR ALL USING (true);

-- EXPENSES
DROP POLICY IF EXISTS "Public All Expenses" ON public.expenses;
CREATE POLICY "Public All Expenses" ON public.expenses FOR ALL USING (true);

-- TRANSACTION CODES
DROP POLICY IF EXISTS "Public All Transaction Codes" ON public.transaction_codes;
CREATE POLICY "Public All Transaction Codes" ON public.transaction_codes FOR ALL USING (true);

-- WALK INS
DROP POLICY IF EXISTS "Public All Walk Ins" ON public.walk_ins;
CREATE POLICY "Public All Walk Ins" ON public.walk_ins FOR ALL USING (true);

-- CLASS COMPLETION CODES
DROP POLICY IF EXISTS "Public All Class Completion Codes" ON public.class_completion_codes;
CREATE POLICY "Public All Class Completion Codes" ON public.class_completion_codes FOR ALL USING (true);

-- ACTIVE SESSIONS
DROP POLICY IF EXISTS "Public All Active Sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Allow all session access" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.active_sessions;
CREATE POLICY "Public All Active Sessions" ON public.active_sessions FOR ALL USING (true);

-- PAYROLL
DROP POLICY IF EXISTS "Public All Payroll" ON public.payroll;
CREATE POLICY "Public All Payroll" ON public.payroll FOR ALL USING (true);

-- HOLIDAYS
DROP POLICY IF EXISTS "Public All Holidays" ON public.holidays;
CREATE POLICY "Public All Holidays" ON public.holidays FOR ALL USING (true);

-- COUPONS
DROP POLICY IF EXISTS "Public All Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow authenticated users to read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admins to manage coupons" ON public.coupons;
CREATE POLICY "Public All Coupons" ON public.coupons FOR ALL USING (true);

-- REFERRALS
DROP POLICY IF EXISTS "Public All Referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referrers can view their referrals" ON public.referrals;
CREATE POLICY "Public All Referrals" ON public.referrals FOR ALL USING (true);


-- ============================================================
-- SECTION 5: GRANTS (Ensure all roles can access tables)
-- ============================================================

GRANT ALL ON public.branches TO anon, authenticated, service_role;
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.plans TO anon, authenticated, service_role;
GRANT ALL ON public.subscriptions TO anon, authenticated, service_role;
GRANT ALL ON public.sales TO anon, authenticated, service_role;
GRANT ALL ON public.attendance TO anon, authenticated, service_role;
GRANT ALL ON public.bookings TO anon, authenticated, service_role;
GRANT ALL ON public.feedback TO anon, authenticated, service_role;
GRANT ALL ON public.inventory TO anon, authenticated, service_role;
GRANT ALL ON public.metrics TO anon, authenticated, service_role;
GRANT ALL ON public.offers TO anon, authenticated, service_role;
GRANT ALL ON public.communications TO anon, authenticated, service_role;
GRANT ALL ON public.class_templates TO anon, authenticated, service_role;
GRANT ALL ON public.class_schedules TO anon, authenticated, service_role;
GRANT ALL ON public.expenses TO anon, authenticated, service_role;
GRANT ALL ON public.transaction_codes TO anon, authenticated, service_role;
GRANT ALL ON public.walk_ins TO anon, authenticated, service_role;
GRANT ALL ON public.class_completion_codes TO anon, authenticated, service_role;
GRANT ALL ON public.active_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.payroll TO anon, authenticated, service_role;
GRANT ALL ON public.holidays TO anon, authenticated, service_role;
GRANT ALL ON public.coupons TO anon, authenticated, service_role;
GRANT ALL ON public.referrals TO anon, authenticated, service_role;

-- ============================================================
-- DONE! Schema fully rebuilt.
-- Next step: Go to /admin-setup in the app to create your
-- Super Admin account, then re-enter your branch(es) and plans.
-- ============================================================
