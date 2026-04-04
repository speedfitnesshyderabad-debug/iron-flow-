-- ============================================================
-- IRON FLOW GYM SOFTWARE - COMPLETE DATABASE SETUP
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor on a fresh database.
-- This combines ALL migrations in the correct order.
-- ============================================================


-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- SECTION 1: CORE TABLES
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
  "termsAndConditions" TEXT,
  settlement_rate NUMERIC DEFAULT 100,
  "imageUrl" TEXT,
  "videoUrl" TEXT
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
  "referralCode" TEXT UNIQUE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "fullDayHours" NUMERIC DEFAULT 8,
  "halfDayHours" NUMERIC DEFAULT 4
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
  "pausedDaysUsed" INTEGER DEFAULT 0,
  "saleId" TEXT
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
  "razorpayPaymentId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
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
  "branchId" TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE
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

-- ACTIVE SESSIONS
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

-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default Home Hero settings
INSERT INTO public.site_settings (key, value)
VALUES ('home_hero', '{
    "heroType": "image",
    "heroImageUrl": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2070",
    "heroVideoUrl": "",
    "heroTitle": "Elite Workout Experience",
    "heroSubtitle": "Access premium facilities, expert trainers, and a community dedicated to your transformation. Find your nearest IronFlow branch today.",
    "heroTagline": "The Future of Fitness is Here"
}')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- SECTION 3: PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_phone_trgm ON public.users USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_memberid_trgm ON public.users USING gin ("memberId" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_branchid ON public.users ("branchId");
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_createdat ON public.users ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_communications_user_read ON public.communications ("userId", is_read);

ANALYZE public.users;


-- ============================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY
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
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 5: SECURITY HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'SUPER_ADMIN' THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_branch()
RETURNS TEXT AS $$
DECLARE
  branch_id TEXT;
BEGIN
  branch_id := (auth.jwt() -> 'user_metadata' ->> 'branchId');
  IF branch_id IS NOT NULL AND branch_id != '' THEN
    RETURN branch_id;
  END IF;
  RETURN (
    SELECT "branchId"
    FROM public.users
    WHERE id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_branch_staff_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (auth.jwt() -> 'user_metadata' ->> 'role') IN ('BRANCH_ADMIN', 'MANAGER', 'RECEPTIONIST') THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
    AND role IN ('BRANCH_ADMIN', 'MANAGER', 'RECEPTIONIST')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- SECTION 6: DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================

DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- ============================================================
-- SECTION 7: RLS POLICIES
-- ============================================================

-- BRANCHES
CREATE POLICY "Public Branch Discovery" ON public.branches
FOR SELECT USING (NOT "isHidden" OR is_super_admin());

CREATE POLICY "Branch Management" ON public.branches
FOR ALL USING (
  is_super_admin() OR id = get_user_branch()
);

-- USERS
CREATE POLICY "User Access" ON public.users
FOR ALL USING (
  (id = auth.uid()::text) OR
  (email = auth.jwt()->>'email') OR
  is_super_admin() OR 
  ("branchId" = get_user_branch() AND is_branch_staff_admin())
);

-- GENERAL DATA TABLES (Branch Isolation)
DO $$ 
DECLARE 
    tbl text;
    tables_to_isolate text[] := ARRAY[
        'plans', 'attendance', 'bookings', 
        'feedback', 'inventory',
        'class_templates', 'class_schedules', 'expenses', 
        'transaction_codes', 'walk_ins', 'class_completion_codes',
        'payroll', 'holidays', 'coupons'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_isolate
    LOOP
        EXECUTE format('
            CREATE POLICY "Branch Data Isolation" ON public.%I
            FOR ALL USING (
                is_super_admin() OR "branchId" = get_user_branch()
            )', tbl);
    END LOOP;
END $$;

-- SALES (with member fallback)
CREATE POLICY "Branch Data Isolation" ON public.sales
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.sales."memberId" AND "branchId" = get_user_branch())
);

-- SUBSCRIPTIONS (with member fallback)
CREATE POLICY "Branch Data Isolation" ON public.subscriptions
FOR ALL USING (
    is_super_admin() OR 
    "branchId" = get_user_branch() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = public.subscriptions."memberId" AND "branchId" = get_user_branch())
);

-- COMMUNICATIONS
CREATE POLICY "Branch Data Isolation" ON public.communications
FOR ALL USING (
    is_super_admin() OR "branchId" = get_user_branch()
);

-- METRICS
CREATE POLICY "Metrics Access" ON public.metrics
FOR ALL USING (
  is_super_admin() OR 
  "memberId" = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = public.metrics."memberId" 
    AND "branchId" = get_user_branch()
  )
);

-- ACTIVE SESSIONS
CREATE POLICY "Sessions Access" ON public.active_sessions
FOR ALL USING (
  is_super_admin() OR user_id = auth.uid()::text
);

-- REFERRALS
CREATE POLICY "Referrals Access" ON public.referrals
FOR ALL USING (
  is_super_admin() OR 
  "referrerId" = auth.uid()::text OR
  "refereeId" = auth.uid()::text OR
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = public.referrals."referrerId" 
    AND "branchId" = get_user_branch()
  )
);

-- OFFERS (Global + Branch)
CREATE POLICY "Offers Select" ON public.offers
FOR SELECT USING (
  is_super_admin() OR 
  "branchId" = 'GLOBAL' OR 
  "branchId" = get_user_branch()
);

CREATE POLICY "Offers Insert" ON public.offers
FOR INSERT WITH CHECK (
  is_super_admin() OR "branchId" = get_user_branch()
);

CREATE POLICY "Offers Delete" ON public.offers
FOR DELETE USING (
  is_super_admin() OR 
  "branchId" = get_user_branch() OR
  ("branchId" = 'GLOBAL' AND is_branch_staff_admin())
);

CREATE POLICY "Offers Update" ON public.offers
FOR UPDATE USING (
  is_super_admin() OR 
  "branchId" = get_user_branch() OR
  ("branchId" = 'GLOBAL' AND is_branch_staff_admin())
);

-- SITE SETTINGS
CREATE POLICY "Public Read Site Settings" ON public.site_settings 
    FOR SELECT USING (true);

CREATE POLICY "Admin Insert Site Settings" ON public.site_settings 
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin Update Site Settings" ON public.site_settings 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SECTION 8: GRANTS
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
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated, service_role;


-- ============================================================
-- SECTION 9: UPDATE FOREIGN KEYS TO ON UPDATE CASCADE
-- (Allows identity transitions / account linking)
-- ============================================================

DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            tc.constraint_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'users' 
          AND ccu.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I) ON DELETE CASCADE ON UPDATE CASCADE', 
            r.table_schema, r.table_name, r.constraint_name, r.column_name, r.table_schema, r.foreign_table_name, r.foreign_column_name);
    END LOOP;
END $$;


-- ============================================================
-- DONE! Full schema setup complete.
-- Next: Go to /admin-setup in the app to create your
-- Super Admin account, then add your branch(es) and plans.
-- ============================================================

SELECT 'IronFlow Database Setup Complete!' AS result;
