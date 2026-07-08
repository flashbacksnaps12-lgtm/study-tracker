'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ArrowUp, Plus } from 'lucide-react'

interface StudySession {
  id: string
  user_id: string
  duration_minutes: number
  date: string
  created_at: string
}

export function Timer({ userId }: { userId: string }) {
  const supabase = createClient()
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startTimeRef, setStartTimeRef] = useState<Date | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch sessions from Supabase
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('study_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })

        if (error) throw error
        setSessions(data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchSessions()
  }, [userId, supabase])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && startTimeRef) {
      interval = setInterval(() => {
        const now = new Date()
        const diff = Math.floor((now.getTime() - startTimeRef.getTime()) / 1000)
        setElapsedSeconds(diff)
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, startTimeRef])

  const handleStart = () => {
    setIsRunning(true)
    setStartTimeRef(new Date())
  }

  const handleStop = async () => {
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

    setIsRunning(false)
    setElapsedSeconds(0)
    setStartTimeRef(null)
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
          <p className="text-4xl font-light text-accent">{formatTimerDisplay(elapsedSeconds)}</p>
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

      <div className="text-center">
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="text-sm text-accent hover:text-accent-bright transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Add manual session
        </button>
      </div>

      {showManualForm && <ManualSessionForm onSubmit={handleManualAdd} />}
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
