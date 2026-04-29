-- SUPABASE REPAIR SCRIPT
-- This script fixes the "cannot alter type of a column used in a policy definition" error
-- by dropping policies first, then changing the column types, then recreating policies.

-- 1. DROP ALL POLICIES FIRST
-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert a profile" ON public.profiles;

-- Subscriptions
DROP POLICY IF EXISTS "Users can read own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Daily Logs
DROP POLICY IF EXISTS "Users can read own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update own daily logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can manage their own logs" ON public.daily_logs;

-- Saved Recipes
DROP POLICY IF EXISTS "Users can read own saved recipes" ON public.saved_recipes;
DROP POLICY IF EXISTS "Users can insert own saved recipes" ON public.saved_recipes;
DROP POLICY IF EXISTS "Users can delete own saved recipes" ON public.saved_recipes;

-- 2. ALTER COLUMN TYPES TO TEXT
-- This ensures Clerk IDs like 'user_...' work correctly
ALTER TABLE public.profiles ALTER COLUMN clerk_user_id TYPE TEXT;
ALTER TABLE public.daily_logs ALTER COLUMN clerk_user_id TYPE TEXT;
ALTER TABLE public.saved_recipes ALTER COLUMN clerk_user_id TYPE TEXT;
ALTER TABLE public.subscriptions ALTER COLUMN clerk_user_id TYPE TEXT;

-- 3. RECREATE POLICIES (Using the 'sub' claim from JWT)
-- Profiles
CREATE POLICY "Users can manage own profile" ON public.profiles
FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Anyone can insert a profile" ON public.profiles
FOR INSERT WITH CHECK (true);

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions
FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
FOR ALL USING (true);

-- Daily Logs
CREATE POLICY "Users can manage own logs" ON public.daily_logs
FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- Saved Recipes
CREATE POLICY "Users can read own saved recipes" ON public.saved_recipes
FOR SELECT USING (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can insert own saved recipes" ON public.saved_recipes
FOR INSERT WITH CHECK (auth.jwt() ->> 'sub' = clerk_user_id);

CREATE POLICY "Users can delete own saved recipes" ON public.saved_recipes
FOR DELETE USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- 4. SETUP STORAGE
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public access to recipe images
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'recipe-images' );

-- Allow authenticated users to upload to recipe-images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK ( bucket_id = 'recipe-images' );

-- 5. WEBHOOK LOGGING
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manage events" ON public.stripe_webhook_events;
CREATE POLICY "Service role manage events" ON public.stripe_webhook_events
FOR ALL USING (true);

-- 6. ENSURE RECIPES TABLE HAS DEFAULTS
ALTER TABLE public.recipes ALTER COLUMN category SET DEFAULT 'General';
ALTER TABLE public.recipes ALTER COLUMN nutritional_insight SET DEFAULT '';
