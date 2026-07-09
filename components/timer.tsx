'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ArrowUp, Plus, Trash2 } from 'lucide-react'

interface StudySession {
  id: string
  user_id: string
  duration_minutes: number
  date: string
  created_at: string
}

interface ActiveSession {
  id: string
  user_id: string
  started_at: string
  paused_at: string | null
  paused_duration_minutes: number
  status: 'running' | 'paused'
}

export function Timer({ userId }: { userId: string }) {
  const supabase = createClient()
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startTimeRef, setStartTimeRef] = useState<Date | null>(null)
  const [pausedAtSeconds, setPausedAtSeconds] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch past sessions + resume any active (running/paused) session on load
  useEffect(() => {
    const init = async () => {
      try {
        const [sessionsRes, activeRes] = await Promise.all([
          supabase
            .from('study_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false }),
          supabase
            .from('active_sessions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
        ])

        if (sessionsRes.error) throw sessionsRes.error
        setSessions(sessionsRes.data || [])

        const active: ActiveSession | null = activeRes.data
        if (active) {
          const started = new Date(active.started_at)
          setStartTimeRef(started)

          if (active.status === 'paused') {
            // Elapsed at the moment it was paused = time from start to paused_at,
            // plus any previously accumulated paused_duration_minutes from earlier pause/resume cycles
            const pausedAt = active.paused_at ? new Date(active.paused_at) : new Date()
            const runSeconds = Math.floor((pausedAt.getTime() - started.getTime()) / 1000)
            const totalElapsed = runSeconds + active.paused_duration_minutes * 60
            setIsPaused(true)
            setIsRunning(false)
            setPausedAtSeconds(totalElapsed)
            setElapsedSeconds(totalElapsed)
          } else {
            // Was running when app closed — recompute live elapsed from timestamp
            setIsRunning(true)
            setIsPaused(false)
            const now = new Date()
            const diff = Math.floor((now.getTime() - started.getTime()) / 1000) + active.paused_duration_minutes * 60
            setElapsedSeconds(diff)
          }
        }
      } catch (error) {
        console.error('[v0] Error loading timer state:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [userId, supabase])

  // Live ticking display while running.
  // Always recompute elapsed time from the real clock (startTimeRef -> now)
  // rather than incrementing a counter, since setInterval gets throttled —
  // or after an OS-level sleep, can stop firing entirely — when the window
  // is minimized, backgrounded, or the laptop sleeps.
  //
  // Since a watchdog built from another setInterval would have the exact
  // same sleep-vulnerability as the thing it's trying to fix, this instead
  // hooks every event that reliably fires when a browser tab resumes after
  // sleep (visibilitychange, focus, pageshow), plus a one-time click
  // fallback on the document as a last resort in case none of those fire
  // in this particular browser after this particular sleep.
  useEffect(() => {
    if (!isRunning || !startTimeRef) return

    const recompute = () => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - startTimeRef.getTime()) / 1000)
      setElapsedSeconds(diff)
    }

    const startInterval = () => {
      clearInterval(interval)
      interval = setInterval(recompute, 1000)
    }

    let interval = setInterval(recompute, 1000)
    recompute()

    const handleWake = () => {
      recompute()
      startInterval()
    }

    document.addEventListener('visibilitychange', handleWake)
    window.addEventListener('focus', handleWake)
    window.addEventListener('pageshow', handleWake)
    // Last-resort fallback: any click anywhere in the app also triggers a
    // recompute, so even if every resume event is missed, the number self-
    // corrects the moment the user touches the page again.
    document.addEventListener('click', recompute)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleWake)
      window.removeEventListener('focus', handleWake)
      window.removeEventListener('pageshow', handleWake)
      document.removeEventListener('click', recompute)
    }
  }, [isRunning, startTimeRef])

  const clearActiveSession = async () => {
    try {
      const { error } = await supabase.from('active_sessions').delete().eq('user_id', userId)
      if (error) throw error
    } catch (error) {
      console.error('[v0] Error clearing active session:', error)
    }
  }

  const handleStart = async () => {
    if (isPaused) {
      // Resuming from pause: write the new "running" row FIRST using a
      // single atomic upsert (not delete-then-insert, which left a window
      // where the database had no active_sessions row at all if the insert
      // failed or was interrupted — causing the session to vanish on reload).
      // Only update the UI once the write is confirmed successful.
      const now = new Date()
      const carriedMinutes = Math.floor(pausedAtSeconds / 60)

      try {
        const { error } = await supabase.from('active_sessions').upsert(
          {
            user_id: userId,
            started_at: now.toISOString(),
            paused_at: null,
            paused_duration_minutes: carriedMinutes,
            status: 'running',
          },
          { onConflict: 'user_id' }
        )
        if (error) throw error

        setIsRunning(true)
        setIsPaused(false)
        setStartTimeRef(now)
      } catch (error) {
        console.error('[v0] Error resuming session:', error)
        alert('Could not resume the timer — please check your connection and try again. Your paused time is safe.')
      }
    } else {
      const now = new Date()

      try {
        const { error } = await supabase.from('active_sessions').upsert(
          {
            user_id: userId,
            started_at: now.toISOString(),
            paused_at: null,
            paused_duration_minutes: 0,
            status: 'running',
          },
          { onConflict: 'user_id' }
        )
        if (error) throw error

        setIsRunning(true)
        setStartTimeRef(now)
      } catch (error) {
        console.error('[v0] Error starting session:', error)
        alert('Could not start the timer — please check your connection and try again.')
      }
    }
  }

  const handlePause = async () => {
    const now = new Date()
    setIsRunning(false)
    setIsPaused(true)
    setPausedAtSeconds(elapsedSeconds)

    try {
      const { error } = await supabase
        .from('active_sessions')
        .update({
          status: 'paused',
          paused_at: now.toISOString(),
        })
        .eq('user_id', userId)
      if (error) throw error
    } catch (error) {
      console.error('[v0] Error pausing session:', error)
    }
  }

  const handleSaveSession = async () => {
    if (!startTimeRef) return

    const durationMinutes = Math.round(elapsedSeconds / 60)
    const date = format(startTimeRef, 'yyyy-MM-dd')

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          duration_minutes: durationMinutes,
          date,
        })
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setSessions([data[0], ...sessions])
      }
    } catch (error) {
      console.error('[v0] Error saving session:', error)
    }

    await clearActiveSession()

    setIsRunning(false)
    setIsPaused(false)
    setElapsedSeconds(0)
    setStartTimeRef(null)
    setPausedAtSeconds(0)
    setShowSaveDialog(false)
  }

  const handleDiscard = async () => {
    await clearActiveSession()
    setIsRunning(false)
    setIsPaused(false)
    setElapsedSeconds(0)
    setStartTimeRef(null)
    setPausedAtSeconds(0)
    setShowSaveDialog(false)
  }

  const handleDeleteSession = async (sessionId: string, createdAt: string) => {
    const createdDate = new Date(createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      alert('You can only delete sessions within 24 hours of creation')
      return
    }

    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      setSessions(sessions.filter((s) => s.id !== sessionId))
    } catch (error) {
      console.error('[v0] Error deleting session:', error)
    }
  }

  const handleManualAdd = async (data: { date: string; hours: number; minutes: number; seconds: number }) => {
    const durationMinutes = data.hours * 60 + data.minutes + Math.round(data.seconds / 60)

    try {
      const { data: insertedData, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          duration_minutes: durationMinutes,
          date: data.date,
        })
        .select()

      if (error) throw error

      if (insertedData && insertedData.length > 0) {
        setSessions([insertedData[0], ...sessions])
      }

      setShowManualForm(false)
    } catch (error) {
      console.error('[v0] Error adding manual session:', error)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const formatTimerDisplay = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Calculate statistics
  const calculateStats = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayTotal = sessions
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.duration_minutes, 0)

    const dates = new Set(sessions.map((s) => s.date))
    const sortedDates = Array.from(dates).sort().reverse()

    let currentStreak = 0
    let prevDate = new Date()
    for (const dateStr of sortedDates) {
      const sessionDate = new Date(dateStr)
      const diffDays = Math.floor((prevDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))

      if (currentStreak === 0 || diffDays === 1) {
        currentStreak++
        prevDate = sessionDate
      } else {
        break
      }
    }

    const thisWeekStart = new Date()
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const thisWeek = sessions
      .filter((s) => {
        const sessionDate = new Date(s.date)
        return sessionDate >= thisWeekStart
      })
      .reduce((sum, s) => sum + s.duration_minutes, 0)

    const lastWeek = sessions
      .filter((s) => {
        const sessionDate = new Date(s.date)
        return sessionDate >= lastWeekStart && sessionDate < thisWeekStart
      })
      .reduce((sum, s) => sum + s.duration_minutes, 0)

    const weekChange = lastWeek === 0 ? 0 : Math.round(((thisWeek - lastWeek) / lastWeek) * 100)

    return { todayTotal, currentStreak, thisWeek, lastWeek, weekChange }
  }

  const { todayTotal, currentStreak, thisWeek, lastWeek, weekChange } = calculateStats()

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <p className="text-sm text-muted-foreground mb-2">TODAY&apos;S TOTAL</p>
        <p className="text-6xl font-light text-foreground mb-1">{formatTime(todayTotal)}</p>
      </div>

      <div className="flex justify-center gap-4 mb-16">
        {!isPaused && !isRunning && (
          <button
            onClick={handleStart}
            className="w-32 h-32 rounded-full bg-accent text-accent-foreground text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            Start
          </button>
        )}
        {isRunning && (
          <button
            onClick={handlePause}
            className="w-32 h-32 rounded-full bg-accent text-accent-foreground text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            Pause
          </button>
        )}
        {isPaused && (
          <>
            <button
              onClick={handleStart}
              className="w-32 h-32 rounded-full bg-accent text-accent-foreground text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              Resume
            </button>
            <button
              onClick={() => setShowSaveDialog(true)}
              className="w-32 h-32 rounded-full bg-emerald-600 text-accent-foreground text-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              Save
            </button>
          </>
        )}
      </div>

      {(isRunning || isPaused) && (
        <div className="text-center mb-12">
          <p className="text-4xl font-light text-accent">{formatTimerDisplay(elapsedSeconds)}</p>
          {isPaused && (
            <p className="text-xs text-muted-foreground mt-2">Paused — resume anytime, even after closing the app</p>
          )}
        </div>
      )}

      {showSaveDialog && (
        <div className="mb-12 bg-card rounded-lg p-6 max-w-md mx-auto border border-border">
          <p className="text-foreground mb-4">Save this session?</p>
          <p className="text-sm text-muted-foreground mb-4">{formatTimerDisplay(elapsedSeconds)}</p>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSession}
              className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Save Session
            </button>
            <button
              onClick={handleDiscard}
              className="flex-1 px-4 py-2 bg-red-600 text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-12">
        <div className="bg-card rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">CURRENT STREAK</p>
          <p className="text-3xl font-light text-foreground">{currentStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">days</p>
        </div>
        <div className="bg-card rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">THIS WEEK</p>
          <p className="text-3xl font-light text-foreground">{formatTime(thisWeek)}</p>
        </div>
        <div className="bg-card rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">VS LAST WEEK</p>
          <div className="flex items-center justify-center gap-1">
            <ArrowUp className={`w-4 h-4 ${weekChange >= 0 ? 'text-accent' : 'text-red-500'}`} />
            <p className="text-2xl font-light text-foreground">{Math.abs(weekChange)}%</p>
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-sm text-accent hover:text-accent-bright transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Add manual session
        </button>
      </div>

      {showManualForm && <ManualSessionForm onSubmit={handleManualAdd} />}

      <div className="mt-12">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">TODAY&apos;S SESSIONS</h3>
        {sessions
          .filter((s) => s.date === format(new Date(), 'yyyy-MM-dd'))
          .length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sessions today yet</p>
        ) : (
          <div className="space-y-2">
            {sessions
              .filter((s) => s.date === format(new Date(), 'yyyy-MM-dd'))
              .map((session) => {
                const hours = Math.floor(session.duration_minutes / 60)
                const mins = session.duration_minutes % 60
                const canDelete =
                  (new Date().getTime() - new Date(session.created_at).getTime()) / (1000 * 60 * 60) <= 24

                return (
                  <div key={session.id} className="flex items-center justify-between bg-card rounded-lg p-4">
                    <div>
                      <p className="text-foreground">
                        {hours}h {mins}m
                      </p>
                      <p className="text-xs text-muted-foreground">{format(new Date(session.created_at), 'HH:mm')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteSession(session.id, session.created_at)}
                      disabled={!canDelete}
                      className={`p-2 rounded transition-colors ${
                        canDelete ? 'text-red-500 hover:bg-red-500/10' : 'text-muted-foreground opacity-50 cursor-not-allowed'
                      }`}
                      title={canDelete ? 'Delete session' : 'Can only delete within 24 hours'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

function ManualSessionForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('0')
  const [seconds, setSeconds] = useState('0')

  return (
    <div className="mt-8 bg-card rounded-lg p-6 max-w-md mx-auto">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full mb-4 px-3 py-2 bg-surface text-foreground rounded border border-border text-sm"
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label className="text-xs text-muted-foreground">Hours</label>
          <input
            type="number"
            min="0"
            max="23"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full px-3 py-2 bg-surface text-foreground rounded border border-border text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Minutes</label>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-full px-3 py-2 bg-surface text-foreground rounded border border-border text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Seconds</label>
          <input
            type="number"
            min="0"
            max="59"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="w-full px-3 py-2 bg-surface text-foreground rounded border border-border text-sm"
          />
        </div>
      </div>

      <button
        onClick={() => {
          onSubmit({
            date,
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0,
            seconds: parseInt(seconds) || 0,
          })
        }}
        className="w-full px-4 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Add Session
      </button>
    </div>
  )
}