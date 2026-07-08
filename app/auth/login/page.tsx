'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username || !password) {
        setError('Please enter username and password')
        setLoading(false)
        return
      }

      // Construct fake email from username using reserved example domain
      const email = `${username.toLowerCase()}@example.com`

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('Username or password is incorrect')
        } else {
          setError(authError.message)
        }
        setLoading(false)
        return
      }

      router.push('/')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Study Tracker</h1>
          <p className="text-text-secondary">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Enter your username"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter your password"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent text-accent-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-secondary text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-accent hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
