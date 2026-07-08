'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!username || !password || !confirmPassword) {
        setError('Please fill in all fields')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (username.length < 3) {
        setError('Username must be at least 3 characters')
        setLoading(false)
        return
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single()

      if (existingProfile) {
        setError('Username is already taken')
        setLoading(false)
        return
      }

      // Construct fake email from username using reserved example domain
      const email = `${username.toLowerCase()}@example.com`

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      router.push('/auth/sign-up-success')
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
          <p className="text-text-secondary">Create a new account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
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
              placeholder="Choose a username"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
            <p className="text-xs text-text-muted mt-1">At least 3 characters</p>
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
              placeholder="Create a password"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
            <p className="text-xs text-text-muted mt-1">At least 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Confirm your password"
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-secondary text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
