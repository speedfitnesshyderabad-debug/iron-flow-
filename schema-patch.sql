-- ============================================================
-- TITAN GYM - SCHEMA PATCH FOR NEW PROJECT
-- Run this in: https://supabase.com → SQL Editor
-- Project: pndiqjfpmgprdirphifb
-- ============================================================

-- TABLE: branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "gstPercentage" INTEGER;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "gateWebhookUrl" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "paymentApiKey" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "paymentMerchantId" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "emailProvider" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "emailApiKey" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "emailFromAddress" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "smsProvider" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "smsApiKey" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "smsSenderId" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS equipment TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "geofenceRadius" INTEGER;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "settlementRate" INTEGER;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS url TEXT;

-- TABLE: plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "durationDays" INTEGER;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "isMultiBranch" BOOLEAN;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "maxSessions" TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "sessionDurationMinutes" TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "groupCapacity" TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS "durationMonths" INTEGER;

-- TABLE: subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "memberId" TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "startDate" DATE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "endDate" DATE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "trainerId" TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "pauseStartDate" TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "pauseAllowanceDays" INTEGER;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "pausedDaysUsed" INTEGER;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS "saleId" TEXT;

-- TABLE: attendance
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "timeIn" TIME;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "timeOut" TIME;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS notes TEXT;

-- TABLE: inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS "branchId" TEXT;

-- TABLE: expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS amount INTEGER;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;


-- ============================================================
-- Check if any source tables are entirely missing from destination
-- ============================================================