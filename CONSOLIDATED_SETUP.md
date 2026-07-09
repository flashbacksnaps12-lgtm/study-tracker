# Study Tracker - Consolidated Setup Guide

This guide consolidates all the code needed to run the multi-user Study Tracker with Supabase authentication.

## Prerequisites

- Node.js 18+
- pnpm/npm/yarn
- Supabase account with a project

## Installation

1. **Create Next.js project**
```bash
npx create-next-app@latest study-tracker --typescript --tailwind --app
cd study-tracker
```

2. **Install dependencies**
```bash
pnpm add @supabase/supabase-js @supabase/ssr recharts date-fns lucide-react
```

3. **Set up environment variables** - Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Setup

### 1. Create Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on study_sessions
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_sessions
CREATE POLICY "sessions_select_own" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.study_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, coalesce(new.raw_user_meta_data ->> 'username', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## File Structure

Create these files in your project:

1. `lib/supabase.ts` - Consolidated Supabase utilities
2. `app/layout.tsx` - Root layout
3. `app/page.tsx` - Main page (redirects to app)
4. `app/auth/login/page.tsx` - Login page
5. `app/auth/sign-up/page.tsx` - Signup page
6. `app/auth/sign-up-success/page.tsx` - Success page
7. `app/auth/callback/route.ts` - Auth callback
8. `middleware.ts` - Session middleware
9. `app/globals.css` - Styles

See the CONSOLIDATED_CODE.md file for all code to copy-paste.

## Running the App

```bash
pnpm dev
```

Visit `http://localhost:3000` and sign up or log in.

## Features

- Username + Password authentication (no email shown to users)
- Study session tracking with timer
- Manual session logging
- Analytics dashboard with heatmap, streaks, and trends
- Dark mode with green accent color
- Multi-user support with Supabase

## Notes

- Usernames must be 3+ characters
- Passwords must be 6+ characters
- Usernames are converted to `${username}@example.com` for Supabase auth
- All data is stored in Supabase with Row Level Security
- Each user can only see and modify their own data
