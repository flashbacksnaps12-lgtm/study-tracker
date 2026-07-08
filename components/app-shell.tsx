'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Timer } from './timer'
import { Insights } from './insights'
import type { User } from '@supabase/supabase-js'

export function AppShell() {
  const [view, setView] = useState<'timer' | 'insights'>('timer')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth/login')
          return
        }

        setUser(session.user)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/auth/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription?.unsubscribe()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-pulse">
            <div className="w-10 h-10 bg-accent rounded-full"></div>
          </div>
          <p className="text-text-muted mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
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
            {user && (
              <>
                <span className="text-sm text-text-muted">{user.user_metadata?.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="w-full">
        {user && (view === 'timer' ? <Timer userId={user.id} /> : <Insights userId={user.id} />)}
      </main>
    </div>
  )
}
