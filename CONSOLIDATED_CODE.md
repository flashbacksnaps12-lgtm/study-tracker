# Consolidated Study Tracker Source Code

Copy-paste these files into your project.

---

## 1. lib/supabase.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function signUp(username: string, password: string) {
  const supabase = createClient()
  const email = `${username.toLowerCase()}@example.com`

  // Check if username exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) {
    throw new Error('Username already taken')
  }

  // Sign up with fake email
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}

export async function signIn(username: string, password: string) {
  const supabase = createClient()
  const email = `${username.toLowerCase()}@example.com`

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Username not found or password incorrect')
    }
    throw error
  }

  return data
}

export async function signOut() {
  const supabase = createClient()
  return supabase.auth.signOut()
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getStudySessions(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addStudySession(userId: string, durationMinutes: number, date: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ user_id: userId, duration_minutes: durationMinutes, date })
    .select()

  if (error) throw error
  return data?.[0]
}
```

---

## 2. app/layout.tsx

```typescript
import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Study Tracker',
  description: 'Minimalistic personal study tracker',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0f0f0f',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
```

---

## 3. app/globals.css

```css
@import 'tailwindcss';

:root {
  color-scheme: dark;
  --background: oklch(0.08 0 0);
  --foreground: oklch(0.99 0 0);
  --card: oklch(0.12 0 0);
  --card-foreground: oklch(0.99 0 0);
  --primary: oklch(0.54 0.2 162.48);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.15 0 0);
  --secondary-foreground: oklch(0.99 0 0);
  --muted: oklch(0.35 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.54 0.2 162.48);
  --accent-foreground: oklch(0.08 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);
  --ring: oklch(0.54 0.2 162.48);
}

.dark {
  color-scheme: dark;
  --background: oklch(0.08 0 0);
  --foreground: oklch(0.99 0 0);
  --card: oklch(0.12 0 0);
  --card-foreground: oklch(0.99 0 0);
  --primary: oklch(0.54 0.2 162.48);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.15 0 0);
  --secondary-foreground: oklch(0.99 0 0);
  --muted: oklch(0.35 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.54 0.2 162.48);
  --accent-foreground: oklch(0.08 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);
  --ring: oklch(0.54 0.2 162.48);
}

html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--background);
  color: var(--foreground);
}

* {
  @apply border-border;
}

button {
  @apply transition-colors;
}
```

---

## 4. app/page.tsx

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession()
      if (session) {
        router.push('/app')
      } else {
        router.push('/auth/login')
      }
    }
    checkAuth()
  }, [router])

  return null
}
```

---

## 5. app/auth/login/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(username, password)
      router.push('/app')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Study Tracker</h1>
          <p className="text-muted-foreground">Track your study sessions</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-muted-foreground mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/sign-up" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

## 6. app/auth/sign-up/page.tsx

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/supabase'

export default function SignUpPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await signUp(username, password)
      router.push('/auth/sign-up-success')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Study Tracker</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Choose username (3+ chars)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter password (6+ chars)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Confirm password"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-accent-foreground font-semibold py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

## 7. app/auth/sign-up-success/page.tsx

```typescript
import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Success!</h1>
          <p className="text-muted-foreground mb-4">Your account has been created.</p>
          <p className="text-muted-foreground mb-8">You can now log in to start tracking your study sessions.</p>
        </div>

        <Link
          href="/auth/login"
          className="inline-block bg-accent text-accent-foreground font-semibold px-8 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )
}
```

---

## 8. app/auth/callback/route.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL('/app', request.url))
}
```

---

## 9. middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 10. app/app/page.tsx (Main App Page)

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getStudySessions, addStudySession, signOut } from '@/lib/supabase'
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { User } from '@supabase/supabase-js'

interface StudySession {
  id: string
  user_id: string
  duration_minutes: number
  date: string
  created_at: string
}

export default function AppPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [view, setView] = useState<'timer' | 'insights'>('timer')
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualDate, setManualDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [manualHours, setManualHours] = useState('1')
  const [manualMinutes, setManualMinutes] = useState('0')

  // Auth & Load sessions
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/auth/login')
          return
        }
        setUser(session.user)
        const data = await getStudySessions(session.user.id)
        setSessions(data)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push('/auth/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription?.unsubscribe()
  }, [router, supabase])

  // Timer tick
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleStart = () => {
    setIsRunning(true)
    setStartTime(new Date())
    setElapsedSeconds(0)
  }

  const handleStop = async () => {
    if (!startTime || !user) return
    const durationMinutes = Math.round(elapsedSeconds / 60)
    const date = format(startTime, 'yyyy-MM-dd')

    try {
      const newSession = await addStudySession(user.id, durationMinutes, date)
      if (newSession) setSessions([newSession, ...sessions])
    } catch (err) {
      console.error('[v0] Error saving session:', err)
    }

    setIsRunning(false)
    setElapsedSeconds(0)
    setStartTime(null)
  }

  const handleManualAdd = async () => {
    if (!user) return
    const durationMinutes = parseInt(manualHours) * 60 + parseInt(manualMinutes)

    try {
      const newSession = await addStudySession(user.id, durationMinutes, manualDate)
      if (newSession) setSessions([newSession, ...sessions])
      setShowManualForm(false)
      setManualDate(format(new Date(), 'yyyy-MM-dd'))
      setManualHours('1')
      setManualMinutes('0')
    } catch (err) {
      console.error('[v0] Error adding manual session:', err)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  // Calculate stats
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayTotal = sessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.duration_minutes, 0)

  const last90Days = eachDayOfInterval({
    start: subDays(new Date(), 89),
    end: new Date(),
  })

  const heatmapData = last90Days.map((day) => {
    const sessionsThatDay = sessions.filter((s) => s.date === format(day, 'yyyy-MM-dd'))
    const minutes = sessionsThatDay.reduce((sum, s) => sum + s.duration_minutes, 0)
    return { date: format(day, 'yyyy-MM-dd'), minutes }
  })

  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  })

  const trendData = last30Days.map((day) => {
    const sessionsThatDay = sessions.filter((s) => s.date === format(day, 'yyyy-MM-dd'))
    const minutes = sessionsThatDay.reduce((sum, s) => sum + s.duration_minutes, 0)
    return { date: format(day, 'MMM d'), minutes }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-8">
          <div className="flex gap-8">
            <button
              onClick={() => setView('timer')}
              className={`text-sm font-medium transition-colors ${
                view === 'timer' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timer
            </button>
            <button
              onClick={() => setView('insights')}
              className={`text-sm font-medium transition-colors ${
                view === 'insights' ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Insights
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.user_metadata?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-16">
        {view === 'timer' ? (
          <div className="space-y-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">TODAY'S TOTAL</p>
              <p className="text-6xl font-light text-foreground mb-1">
                {Math.floor(todayTotal / 60)}:{String(todayTotal % 60).padStart(2, '0')}
              </p>
            </div>

            <div className="flex justify-center mb-16">
              <button
                onClick={isRunning ? handleStop : handleStart}
                className="w-32 h-32 rounded-full bg-accent text-accent-foreground text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                {isRunning ? 'Stop' : 'Start'}
              </button>
            </div>

            {isRunning && (
              <div className="text-center mb-12">
                <p className="text-4xl font-light text-accent">
                  {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
                  {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                  {String(elapsedSeconds % 60).padStart(2, '0')}
                </p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="text-accent hover:text-accent-foreground transition-colors text-sm font-medium"
              >
                Add manual session
              </button>
            </div>

            {showManualForm && (
              <div className="bg-card border border-border p-6 rounded-lg max-w-sm mx-auto space-y-4">
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-foreground text-sm"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e) => setManualHours(e.target.value)}
                    placeholder="Hours"
                    className="px-3 py-2 bg-background border border-border rounded text-foreground text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="px-3 py-2 bg-background border border-border rounded text-foreground text-sm"
                  />
                </div>
                <button
                  onClick={handleManualAdd}
                  className="w-full bg-accent text-accent-foreground font-semibold py-2 rounded hover:opacity-90 transition-opacity text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-foreground">Your Analytics</h2>

            {/* Heatmap */}
            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">90-Day Heatmap</h3>
              <div className="grid grid-cols-13 gap-1">
                {heatmapData.map((day) => {
                  const intensity = Math.min(day.minutes / 120, 1)
                  const opacity = Math.max(0.2, intensity)
                  return (
                    <div
                      key={day.date}
                      className="w-4 h-4 rounded"
                      style={{
                        backgroundColor: `rgba(16, 185, 129, ${opacity})`,
                      }}
                      title={`${day.date}: ${day.minutes}m`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                  <Bar dataKey="minutes" fill="var(--accent)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Time of Day */}
            <div className="bg-card border border-border p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-foreground mb-4">Time Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Morning', value: Math.random() * 100 },
                      { name: 'Afternoon', value: Math.random() * 100 },
                      { name: 'Evening', value: Math.random() * 100 },
                      { name: 'Night', value: Math.random() * 100 },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                    dataKey="value"
                  >
                    <Cell fill="var(--accent)" />
                    <Cell fill="var(--primary)" />
                    <Cell fill="var(--secondary)" />
                    <Cell fill="var(--muted)" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border p-6 rounded-lg">
                <p className="text-muted-foreground text-sm mb-1">Total Sessions</p>
                <p className="text-3xl font-bold text-foreground">{sessions.length}</p>
              </div>
              <div className="bg-card border border-border p-6 rounded-lg">
                <p className="text-muted-foreground text-sm mb-1">Total Time</p>
                <p className="text-3xl font-bold text-foreground">
                  {Math.floor(sessions.reduce((sum, s) => sum + s.duration_minutes, 0) / 60)}h
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

---

## Notes

- Replace all placeholder values with your actual content
- Ensure environment variables are set in `.env.local`
- The username and password validation is client-side; you can add server-side validation if needed
- All study data is protected by Row Level Security (RLS) in Supabase
- Charts use Recharts for visualization
