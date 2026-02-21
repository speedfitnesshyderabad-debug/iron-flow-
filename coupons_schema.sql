-- Create Coupons table
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
    "branchId" TEXT REFERENCES public.branches(id) ON DELETE CASCADE, -- NULL means GLOBAL
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read active coupons" ON public.coupons 
    FOR SELECT USING (
        "isActive" = TRUE 
        AND ("expiryDate" IS NULL OR "expiryDate" >= CURRENT_DATE)
        AND ("usageLimit" IS NULL OR "timesUsed" < "usageLimit")
    );

CREATE POLICY "Allow admins to manage coupons" ON public.coupons 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid()::text 
            AND role IN ('SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER')
        )
    );
