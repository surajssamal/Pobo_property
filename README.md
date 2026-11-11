# POBO Premium Properties CRM

A luxury real estate customer enquiry capture & Area Ambassador pipeline CRM system built with Next.js 14 (App Router), Tailwind CSS, and Supabase.

---

## 🚀 Deploying to Vercel

### Step 1: Push Code to GitHub / GitLab / Bitbucket
Ensure your repository is pushed to your Git provider.

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your repository.
3. Framework Preset will automatically detect **Next.js**.
4. Root Directory should be `./` (the root).

### Step 3: Configure Environment Variables in Vercel
In the Vercel project configuration screen, open the **Environment Variables** section and add the following 3 variables:

| Variable Name | Description | Example / Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Public API Key | `eyJhbGciOi...` |
| `ADMIN_INVITE_CODE` | Secret passphrase to register Admin accounts | `POBO_ADMIN_2026` (Never expose via `NEXT_PUBLIC_`) |

> **Security Note:** `ADMIN_INVITE_CODE` runs strictly on the server (`/api/admin/verify-invite`) and is never leaked to the client browser.

### Step 4: Database Setup (Supabase)
Before testing live signups or forms, execute the full schema in your Supabase SQL Editor:
- Run the contents of [`supabase_schema.sql`](./supabase_schema.sql).

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Setup your local environment variables
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and ADMIN_INVITE_CODE

# 3. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 🧭 Application Routes

- `/` — Customer Enquiry form with Indian states dropdown, budget tiers, and phone duplication handling.
- `/admin/login` — Administrator authentication (requires `ADMIN_INVITE_CODE` for signups).
- `/admin` — Admin CRM dashboard (lead assignments, status updates, analytics).
- `/worker/login` — Area Ambassador authentication.
- `/worker` — Area Ambassador portal with strict lead isolation.
- `/api/admin/verify-invite` — Serverless API route verifying admin invite passphrases.
