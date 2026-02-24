-- Fix RLS policy for offers table to allow deletion of GLOBAL campaigns
-- by Super Admins AND Branch Admins.
-- Run this in your Supabase SQL Editor.

-- Drop the old blanket policy for offers
DROP POLICY IF EXISTS "Branch Data Isolation" ON public.offers;

-- Create a refined SELECT policy (anyone can view GLOBAL offers or their branch offers)
CREATE POLICY "Offers Select" ON public.offers
FOR SELECT USING (
  is_super_admin() OR 
  "branchId" = 'GLOBAL' OR 
  "branchId" = get_user_branch()
);

-- Create an INSERT policy (Super Admins and Branch Admins can create offers)
CREATE POLICY "Offers Insert" ON public.offers
FOR INSERT WITH CHECK (
  is_super_admin() OR "branchId" = get_user_branch()
);

-- Create a DELETE policy: Super Admins can delete any offer.
-- Branch Admins can delete their own branch or GLOBAL offers.
CREATE POLICY "Offers Delete" ON public.offers
FOR DELETE USING (
  is_super_admin() OR 
  "branchId" = get_user_branch() OR
  ("branchId" = 'GLOBAL' AND is_branch_staff_admin())
);

-- Create an UPDATE policy (same as delete)
CREATE POLICY "Offers Update" ON public.offers
FOR UPDATE USING (
  is_super_admin() OR 
  "branchId" = get_user_branch() OR
  ("branchId" = 'GLOBAL' AND is_branch_staff_admin())
);
