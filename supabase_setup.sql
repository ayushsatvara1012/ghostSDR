-- MASTER SUPABASE RESET SCRIPT
-- RUN THIS IN THE SUPABASE SQL EDITOR

-- 1. DROP EXISTING TABLES (CLEAN SLATE)
-- We drop in reverse order of dependencies
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.sdr_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. CREATE 'users' TABLE (Core SaaS User Table)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users NOT NULL,
  email text UNIQUE NOT NULL,
  hashed_password text, -- Optional: Syncs with auth.users encrypted_password
  stripe_customer_id text UNIQUE,
  tier text DEFAULT 'free',
  api_credits int DEFAULT 50,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CREATE 'sdr_profiles' TABLE (The AI Context)
CREATE TABLE public.sdr_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL UNIQUE,
  company_name text NOT NULL,
  value_proposition text NOT NULL,
  target_audience text NOT NULL,
  tone_of_voice text DEFAULT 'Professional, direct, and highly technical',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE 'campaigns' TABLE
CREATE TABLE public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  search_query text NOT NULL,
  status text DEFAULT 'completed',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CREATE 'leads' TABLE
CREATE TABLE public.leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES public.campaigns(id) NOT NULL,
  full_name text NOT NULL,
  linkedin_url text,
  headline text,
  relevance_score int NOT NULL,
  suggested_opening_line text NOT NULL,
  key_insights jsonb NOT NULL,
  status text DEFAULT 'drafted',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SETUP THE AUTOMATIC AUTH TRIGGER
-- This function runs every time a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, hashed_password, api_credits)
  VALUES (new.id, new.email, new.encrypted_password, 50);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. BACKFILL EXISTING USERS
-- If you already have users in Auth, this copies them to public.users
INSERT INTO public.users (id, email, hashed_password, api_credits)
SELECT id, email, encrypted_password, 50 FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 9. CREATE POLICIES (Users manage their own data)
CREATE POLICY "Users can manage their own data" ON users FOR ALL TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can manage their own sdr_profile" ON sdr_profiles FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own campaigns" ON campaigns FOR ALL TO authenticated USING (auth.uid() = user_id);
-- Leads are group based: you can see leads in campaigns you own
CREATE POLICY "Users can manage leads in their campaigns" ON leads FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = leads.campaign_id AND campaigns.user_id = auth.uid()));
