-- 1. Create a table for users/profiles (linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('admin', 'area_ambassador')) not null default 'area_ambassador',
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- 2. Create leads table with foreign keys for assigned Area Ambassador
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null unique,
  preferred_location text not null,
  budget text not null,
  property_type text not null,
  purchase_timeline text not null,
  status text check (status in ('New', 'Contacted', 'Qualified', 'Site Visit', 'Won', 'Lost')) default 'New' not null,
  assigned_aa_id uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.leads enable row level security;

-- 3. Create lead notes / history log table
create table public.lead_notes (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  author_id uuid references public.profiles(id),
  note text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.lead_notes enable row level security;

-- 4. RLS Security Policies
-- Admins can do everything
create policy "Admins have full access" on public.leads
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Area Ambassadors can only view leads assigned to them
create policy "AAs view assigned leads" on public.leads
  for select using (assigned_aa_id = auth.uid());

-- Area Ambassadors can update status/notes of leads assigned to them
create policy "AAs update assigned leads" on public.leads
  for update using (assigned_aa_id = auth.uid());

-- Allow profiles to be read by authenticated users
create policy "Users view profiles" on public.profiles
  for select using (auth.role() = 'authenticated');
