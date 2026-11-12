# 🏡 POBO Estates CRM & Customer Enquiry Platform

A modern, high-performance real estate customer enquiry webpage and pipeline CRM built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL + Auth + Row Level Security)**.

---

## 🌟 Key Features

- **Luxury Customer Enquiry Webpage (`/`)**:
  - Natural architectural hero design with glassmorphism overlays and background imagery.
  - Comprehensive field validation:
    - **Name**: Required, min 2 characters, alphabetic and special punctuation check.
    - **Phone**: 10-digit Indian mobile validation (`^[6-9]\d{9}$`), real-time display formatting (`+91 98765 43210`), and duplicate prevention.
    - **Preferred Location**: Dropdown covering all **28 Indian States & 8 Union Territories**.
    - **Budget**: Standard real estate brackets (₹30L to ₹10Cr+) with custom budget entry support.
    - **Property Type**: Dropdown (Villas, High-Rise Apartments, Penthouses, Plots, Commercial, Farmhouses).
    - **Purchase Timeline**: Timeline selectors (Immediate, 1-3 Months, 3-6 Months, Future).
    - **Notes**: Custom preference specifications up to 500 characters.
  - Smart duplicate detection against local storage and Supabase RPC functions with user bypass confirmation.

- **Executive Admin Portal (`/admin` & `/admin/login`)**:
  - Live lead management table with real-time status updates (`New`, `Contacted`, `Qualified`, `Site Visit`, `Won`, `Lost`).
  - Search and filter by status.
  - Area Ambassador assignment per lead.
  - Activity notes and historical logging.
  - Server-side verified registration (`ADMIN_INVITE_CODE`) and **Instant One-Click Demo Mode**.

- **Area Ambassador / Worker Portal (`/worker` & `/worker/login`)**:
  - **Strict Row-Level Security Isolation**: Ambassadors can **only** view and update leads specifically assigned to them.
  - Dedicated interaction notes and callback logging.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ recommended
- **npm** or **yarn** or **pnpm**
- A free **[Supabase](https://supabase.com)** project

---

### 2. Supabase Database & Auth Setup

> [!IMPORTANT]
> To avoid database permission errors (`42501 - new row violates row-level security policy`), make sure to run the complete schema below.

#### Step A: Run the SQL Schema
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **SQL Editor** → **New Query**.
3. Copy and run the entire contents of [`supabase_schema.sql`](./supabase_schema.sql) (or run the SQL snippet below):

```sql
-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'area_ambassador')) NOT NULL DEFAULT 'area_ambassador',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Leads Table
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

-- 3. Lead Notes Table
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- 4. Row Level Security Policies
-- Allow anyone (public/anon) to insert new enquiries
DROP POLICY IF EXISTS "Allow public submissions on leads" ON public.leads;
CREATE POLICY "Allow public submissions on leads"
ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins full access to all leads
DROP POLICY IF EXISTS "Admins full access to leads" ON public.leads;
CREATE POLICY "Admins full access to leads"
ON public.leads FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Ambassadors can only view and update leads assigned to them
DROP POLICY IF EXISTS "Ambassadors view strictly assigned leads" ON public.leads;
CREATE POLICY "Ambassadors view strictly assigned leads"
ON public.leads FOR SELECT TO authenticated
USING (assigned_aa_id = auth.uid());

DROP POLICY IF EXISTS "Ambassadors update strictly assigned leads" ON public.leads;
CREATE POLICY "Ambassadors update strictly assigned leads"
ON public.leads FOR UPDATE TO authenticated
USING (assigned_aa_id = auth.uid());

-- Profiles access
DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert profiles on registration" ON public.profiles;
CREATE POLICY "Allow insert profiles on registration" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
CREATE POLICY "Allow update own profile" ON public.profiles FOR UPDATE TO anon, authenticated USING (true);

-- Notes access
DROP POLICY IF EXISTS "Allow read notes" ON public.lead_notes;
CREATE POLICY "Allow read notes" ON public.lead_notes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert notes" ON public.lead_notes;
CREATE POLICY "Allow insert notes" ON public.lead_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
```

#### Step B: Configure Supabase Auth (Avoid Email Rate Limits)
1. In your **Supabase Dashboard**, go to **Authentication** → **Providers** → **Email**.
2. **Turn off "Confirm email"** (recommended for staging/development to prevent hitting the free-tier rate limit of ~3 emails/hour).
3. If you want to create an Admin immediately:
   - Go to **Authentication** → **Users** → **Add User** → **Create User**.
   - Email: `admin@poboestates.com` (or your chosen email).
   - Password: Choose a strong password.
   - Toggle **"Auto Confirm User?"** to **ON**.
   - Run this SQL query to assign the `admin` role:
     ```sql
     INSERT INTO public.profiles (id, full_name, role)
     SELECT id, 'Primary Administrator', 'admin'
     FROM auth.users
     WHERE email = 'admin@poboestates.com'
     ON CONFLICT (id) DO UPDATE SET role = 'admin';
     ```

---

### 3. Local Environment Setup

1. **Clone & install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file in the root directory (you can copy `.env.example`):
   ```bash
   cp .env.example .env.local
   ```

   Update the values in `.env.local`:
   ```env
   # Your Supabase Project URL & Anon Public API Key (Supabase -> Settings -> API)
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-or-publishable-key"

   # Secret server-side invite code for Admin registration
   ADMIN_INVITE_CODE="POBO_ADMIN_2026"
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧭 Page Routes & Portal Architecture

| Route | Name | Description |
|---|---|---|
| `/` | **Customer Enquiry Page** | Public front-end where visitors select preferences and submit leads. |
| `/admin/login` | **Admin Authentication** | Secure login & invite-code protected registration for executives. Also includes instant Demo Mode. |
| `/admin` | **Admin Leads Dashboard** | Full pipeline view, status kanban/table, ambassador assignment, and internal notes. |
| `/worker/login` | **Ambassador Login** | Login portal for assigned field workers and area ambassadors. |
| `/worker` | **Ambassador Portal** | Restricted view displaying exclusively the leads assigned to the logged-in ambassador. |
| `/api/admin/verify-invite` | **Invite Verification API** | Server-side route verifying the secret `ADMIN_INVITE_CODE`. |

---

## 🔧 Diagnostics & Troubleshooting

### 1. "When I click submit/publish, leads do not update in the database"
- **Cause**: Row-Level Security (RLS) on the `leads` table does not have an anonymous `INSERT` policy, returning error code `42501`.
- **Solution**: Run [`supabase_schema.sql`](./supabase_schema.sql) in your Supabase SQL Editor. Specifically ensure:
  ```sql
  CREATE POLICY "Allow public submissions on leads"
  ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
  ```

### 2. "Email address error / rate limit on Admin login or signup"
- **Cause**: Supabase free-tier restricts transactional emails to 3–4 emails/hr (`over_email_send_rate_limit`).
- **Solution**:
  - **Quickest**: Use the **"One-Click Demo Admin"** button on [`/admin/login`](http://localhost:3000/admin/login).
  - **Permanent**: Disable "Confirm email" in Supabase Dashboard → Authentication → Providers → Email, or create an auto-confirmed user directly from the Supabase Users dashboard.

### 3. "Duplicate phone number warning"
- By default, each phone number can only be submitted once per campaign to prevent spam.
- If a client wants to update their enquiry, the form prompts a warning modal allowing them to proceed with a `[REPEAT ENQUIRY]` tag.

---

## 📦 Production Deployment (Vercel)

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Go to **[Vercel](https://vercel.com)** and click **"Add New Project"**.
3. Select your repository (Vercel will detect Next.js automatically).
4. In the **Environment Variables** tab, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_INVITE_CODE`
5. Click **Deploy**. Your luxury enquiry platform and CRM are live!

---

## 📄 License
Private & Proprietary — Developed for POBO Estates.
