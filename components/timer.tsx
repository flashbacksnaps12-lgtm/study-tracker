'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { getTodayTotal, getCurrentStreak, getWeekTotal } from '@/lib/analytics'
import { StudySession, addSession, generateId, getStoredSessions } from '@/lib/storage'
import { ArrowUp, Plus } from 'lucide-react'

export function Timer() {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [startTimeRef, setStartTimeRef] = useState<Date | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [sessions, setSessions] = useState<StudySession[]>([])

  useEffect(() => {
    setSessions(getStoredSessions())
  }, [])

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

  const handleStop = () => {
    if (!startTimeRef) return

    const endTime = new Date()
    const session: StudySession = {
      id: generateId(),
      date: format(startTimeRef, 'yyyy-MM-dd'),
      startTime: startTimeRef.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: elapsedSeconds,
    }

    addSession(session)
    const updatedSessions = getStoredSessions()
    setSessions(updatedSessions)

    setIsRunning(false)
    setElapsedSeconds(0)
    setStartTimeRef(null)
  }

  const handleManualAdd = (data: { date: string; hours: number; minutes: number; seconds: number }) => {
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds
    const sessionDate = new Date(data.date + 'T12:00:00')
    const startTime = new Date(sessionDate)
    startTime.setHours(startTime.getHours() - 1)
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000)

    const session: StudySession = {
      id: generateId(),
      date: data.date,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds,
    }

    addSession(session)
    const updatedSessions = getStoredSessions()
    setSessions(updatedSessions)
    setShowManualForm(false)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const todayTotal = getTodayTotal(sessions)
  const currentStreak = getCurrentStreak(sessions)
  const thisWeek = getWeekTotal(sessions, 0)
  const lastWeek = getWeekTotal(sessions, 1)
  const weekChange = lastWeek === 0 ? 0 : Math.round(((thisWeek - lastWeek) / lastWeek) * 100)

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
          <p className="text-4xl font-light text-accent">{formatTime(elapsedSeconds)}</p>
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
