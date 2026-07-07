'use client'

import { useState } from 'react'
import { Timer } from './timer'
import { Insights } from './insights'

export function AppShell() {
  const [view, setView] = useState<'timer' | 'insights'>('timer')

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-center gap-8">
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
      </nav>

      <main className="w-full">
        {view === 'timer' ? <Timer /> : <Insights />}
      </main>
    </div>
  )
}
