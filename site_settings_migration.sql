
-- 1. Create site_settings table for global app configuration
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add per-branch media columns for the Landing Page
ALTER TABLE public.branches 
    ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- 3. Seed default Home Hero settings
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

-- 4. Enable RLS and Grant Permissions
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even guests) to read site settings
DROP POLICY IF EXISTS "Public Read Site Settings" ON public.site_settings;
CREATE POLICY "Public Read Site Settings" ON public.site_settings 
    FOR SELECT USING (true);

-- Allow authenticated users to INSERT and UPDATE site settings
DROP POLICY IF EXISTS "Admin Insert Site Settings" ON public.site_settings;
CREATE POLICY "Admin Insert Site Settings" ON public.site_settings 
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Update Site Settings" ON public.site_settings;
CREATE POLICY "Admin Update Site Settings" ON public.site_settings 
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Ensure anon/authenticated can read site settings
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
