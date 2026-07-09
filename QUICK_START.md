# Study Tracker - Quick Start Copy-Paste Guide

## Super Quick Setup

1. **Create project**
   ```bash
   npx create-next-app@latest --typescript --tailwind --app study-tracker
   cd study-tracker
   ```

2. **Install packages**
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr recharts date-fns lucide-react
   ```

3. **Set environment** - Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx
   ```

4. **Run Supabase SQL** - In Supabase dashboard SQL editor:
   ```sql
   -- Tables
   CREATE TABLE public.profiles (id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, username TEXT UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
   CREATE TABLE public.study_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, duration_minutes INTEGER NOT NULL, date DATE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

   -- RLS
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

   -- Policies
   CREATE POLICY "profiles_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
   CREATE POLICY "sessions_own" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "sessions_insert" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

   -- Trigger
   CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
     INSERT INTO public.profiles (id, username) VALUES (new.id, coalesce(new.raw_user_meta_data->>'username', ''));
     RETURN new;
   END; $$ LANGUAGE plpgsql SECURITY DEFINER;
   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

5. **Copy files** - See `CONSOLIDATED_CODE.md` for all code to copy into your project

6. **Run**
   ```bash
   pnpm dev
   ```
   Visit http://localhost:3000 and sign up!

## File Structure Needed

```
your-project/
├── lib/
│   └── supabase.ts          ← Copy from CONSOLIDATED_CODE.md
├── app/
│   ├── layout.tsx           ← Copy from CONSOLIDATED_CODE.md
│   ├── page.tsx             ← Copy from CONSOLIDATED_CODE.md
│   ├── globals.css          ← Copy from CONSOLIDATED_CODE.md
│   ├── app/
│   │   └── page.tsx         ← Copy from CONSOLIDATED_CODE.md (Main app page)
│   └── auth/
│       ├── login/
│       │   └── page.tsx     ← Copy from CONSOLIDATED_CODE.md
│       ├── sign-up/
│       │   └── page.tsx     ← Copy from CONSOLIDATED_CODE.md
│       ├── sign-up-success/
│       │   └── page.tsx     ← Copy from CONSOLIDATED_CODE.md
│       └── callback/
│           └── route.ts     ← Copy from CONSOLIDATED_CODE.md
├── middleware.ts            ← Copy from CONSOLIDATED_CODE.md
└── .env.local               ← Add your Supabase keys
```

## What You Get

- Username + password authentication (no email shown to users)
- Study session timer with start/stop
- Manual session logging
- Analytics with 90-day heatmap, trends, time distribution
- Dark mode with green accent
- Multi-user support with Supabase

## Key Features

- **All code in CONSOLIDATED_CODE.md** - Just copy and paste
- **Minimal dependencies** - Only what's needed
- **Supabase-powered** - Secure, scalable backend
- **Dark theme** - Beautiful UI out of the box
- **RLS-protected** - Users can only see their own data

## Troubleshooting

**Email validation error?** - Supabase validates emails. Using `@example.com` domain works fine.

**Build fails?** - Make sure `middleware.ts` is at root of project, not in `app/` folder.

**Sessions not saving?** - Check Supabase RLS policies are enabled and env vars are correct.

**Can't sign up?** - Username must be 3+ chars, password 6+ chars.

## See Full Docs

- Setup guide: `CONSOLIDATED_SETUP.md`
- All code: `CONSOLIDATED_CODE.md`
