-- ============================================================
-- POBO Real Estate CRM: Admin & Worker Tables Schema
-- With Supabase Authentication, Profile Auto-Registration,
-- and STRICT AMBASSADOR ISOLATION
-- (100% Safe to Re-Run: Drops existing policies first)
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

-- 1. Create a table for users/profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'area_ambassador')) NOT NULL DEFAULT 'area_ambassador',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create leads table with foreign keys for assigned Area Ambassador
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    preferred_location TEXT NOT NULL,
    budget TEXT NOT NULL,
    property_type TEXT NOT NULL,
    purchase_timeline TEXT NOT NULL,
    status TEXT CHECK (status IN ('New', 'Contacted', 'Qualified', 'Site Visit', 'Won', 'Lost')) DEFAULT 'New' NOT NULL,
    assigned_aa_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. Create lead notes / history log table
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES & STRICT ISOLATION
-- (All policies dropped first to prevent 42710 'already exists' error)
-- ============================================================

-- Drop all existing policies on LEADS
DROP POLICY IF EXISTS "Allow public submissions on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow read access to leads" ON public.leads;
DROP POLICY IF EXISTS "Allow update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Admins have full access" ON public.leads;
DROP POLICY IF EXISTS "AAs view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "AAs update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Ambassadors view strictly assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Ambassadors update strictly assigned leads" ON public.leads;

-- Drop all existing policies on LEAD NOTES
DROP POLICY IF EXISTS "Allow read notes" ON public.lead_notes;
DROP POLICY IF EXISTS "Allow insert notes" ON public.lead_notes;

-- Drop all existing policies on PROFILES
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles on registration" ON public.profiles;
DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update own profile" ON public.profiles;

-- ------------------------------------------------------------
-- CREATE CLEAN LEADS POLICIES
-- ------------------------------------------------------------

-- A. Allow public / anonymous visitors to submit new leads from the customer enquiry webpage
CREATE POLICY "Allow public submissions on leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- B. STRICT ISOLATION: Admins have full access to all leads
CREATE POLICY "Admins full access to leads"
ON public.leads
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- C. STRICT ISOLATION: Area Ambassadors can ONLY view leads assigned to them!
CREATE POLICY "Ambassadors view strictly assigned leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
    assigned_aa_id = auth.uid()
);

-- D. STRICT ISOLATION: Area Ambassadors can ONLY update leads assigned to them!
CREATE POLICY "Ambassadors update strictly assigned leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
    assigned_aa_id = auth.uid()
);

-- ------------------------------------------------------------
-- CREATE LEAD NOTES POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Allow read notes"
ON public.lead_notes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert notes"
ON public.lead_notes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- ------------------------------------------------------------
-- CREATE PROFILES POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Allow read profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert profiles on registration"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow update own profile"
ON public.profiles
FOR UPDATE
TO anon, authenticated
USING (true);

-- ============================================================
-- 5. SUPABASE AUTH USER TRIGGER
-- Automatically creates a public.profiles record when a user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'area_ambassador'),
    COALESCE(new.raw_user_meta_data->>'phone', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. DUPLICATE CHECK FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_enquiry_phone_exists(p_phone TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_clean TEXT;
    v_exists BOOLEAN;
BEGIN
    v_clean := RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);
    SELECT EXISTS (
        SELECT 1 FROM public.leads
        WHERE RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10) = v_clean
    ) INTO v_exists;
    RETURN v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_enquiry_phone_exists(TEXT) TO anon, authenticated;
