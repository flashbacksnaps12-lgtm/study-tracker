'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, subDays, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Flame } from 'lucide-react'

interface StudySession {
  id: string
  user_id: string
  duration_minutes: number
  date: string
  created_at: string
}

export function Insights({ userId }: { userId: string }) {
  const supabase = createClient()
  const [trendDays, setTrendDays] = useState(30)
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

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

  // Calculate heatmap data
  const heatmapData = useMemo(() => {
    const last365Days = []
    for (let i = 364; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const dayTotal = sessions
        .filter((s) => s.date === date)
        .reduce((sum, s) => sum + s.duration_minutes, 0)
      last365Days.push({ date, duration: dayTotal })
    }
    return last365Days
  }, [sessions])

  // Calculate streaks
  const { currentStreak, longestStreak } = useMemo(() => {
    const dates = Array.from(new Set(sessions.map((s) => s.date))).sort().reverse()
    let current = 0
    let longest = 0
    let prevDate = new Date()

    for (const dateStr of dates) {
      const sessionDate = new Date(dateStr)
      const diffDays = Math.floor((prevDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))

      if (current === 0 || diffDays === 1) {
        current++
        longest = Math.max(longest, current)
        prevDate = sessionDate
      } else {
        break
      }
    }

    return { currentStreak: current, longestStreak: longest }
  }, [sessions])

  // Calculate trend data
  const trendData = useMemo(() => {
    const data = []
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM dd')
      const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const duration = sessions
        .filter((s) => s.date === dateStr)
        .reduce((sum, s) => sum + s.duration_minutes, 0)
      data.push({ date, duration })
    }
    return data
  }, [sessions, trendDays])

  // Calculate time of day
  const timeOfDayData = useMemo(() => {
    const morning = sessions.filter((s) => parseInt(s.created_at.split('T')[1]) < 12).reduce((sum, s) => sum + s.duration_minutes, 0)
    const afternoon = sessions.filter((s) => {
      const hour = parseInt(s.created_at.split('T')[1])
      return hour >= 12 && hour < 18
    }).reduce((sum, s) => sum + s.duration_minutes, 0)
    const evening = sessions.filter((s) => {
      const hour = parseInt(s.created_at.split('T')[1])
      return hour >= 18 && hour < 21
    }).reduce((sum, s) => sum + s.duration_minutes, 0)
    const night = sessions.filter((s) => parseInt(s.created_at.split('T')[1]) >= 21).reduce((sum, s) => sum + s.duration_minutes, 0)

    return [
      { name: 'Morning', value: morning || 0 },
      { name: 'Afternoon', value: afternoon || 0 },
      { name: 'Evening', value: evening || 0 },
      { name: 'Night', value: night || 0 },
    ].filter((d) => d.value > 0)
  }, [sessions])

  // Calculate consistency score
  const consistencyScore = useMemo(() => {
    const last30Days = []
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
      last30Days.push(date)
    }

    const daysWithSessions = new Set(sessions.filter((s) => last30Days.includes(s.date)).map((s) => s.date)).size
    return Math.round((daysWithSessions / 30) * 100)
  }, [sessions])

  // Calculate statistics
  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        averageSessionLength: 0,
        averageDailyTime: 0,
        totalSessions: 0,
        longestSession: 0,
        totalTime: 0,
      }
    }

    const totalTime = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)
    const uniqueDays = new Set(sessions.map((s) => s.date)).size
    const longestSession = Math.max(...sessions.map((s) => s.duration_minutes))

    return {
      averageSessionLength: Math.round(totalTime / sessions.length),
      averageDailyTime: Math.round(totalTime / uniqueDays),
      totalSessions: sessions.length,
      longestSession,
      totalTime: Math.round(totalTime / 60),
    }
  }, [sessions])

  const maxDuration = useMemo(() => Math.max(...heatmapData.map((d) => d.duration), 1), [heatmapData])

  const getHeatmapColor = (duration: number) => {
    if (duration === 0) return { color: 'bg-slate-700', opacity: 'opacity-20' }
    if (duration >= 480) return { color: 'bg-purple-600', opacity: 'opacity-100' } // 8+ hours = purple
    const intensity = duration / maxDuration
    if (intensity < 0.25) return { color: 'bg-accent', opacity: 'opacity-25' }
    if (intensity < 0.5) return { color: 'bg-accent', opacity: 'opacity-40' }
    if (intensity < 0.75) return { color: 'bg-accent', opacity: 'opacity-60' }
    return { color: 'bg-accent', opacity: 'opacity-100' }
  }

  const COLORS = ['#10b981', '#0d9488', '#059669', '#047857']

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Loading insights...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">CONTRIBUTION HEATMAP</h2>
          <div className="bg-card rounded-lg p-6">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-53 gap-1 min-w-max">
                {heatmapData.map((day, idx) => {
                  const { color, opacity } = getHeatmapColor(day.duration)
                  const hours = Math.floor(day.duration / 60)
                  const mins = day.duration % 60
                  const displayText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

                  return (
                    <div
                      key={idx}
                      className={`w-3 h-3 rounded-sm ${color} ${opacity} transition-opacity hover:opacity-100 cursor-pointer group relative`}
                      title={`${day.date}: ${displayText}`}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-surface rounded text-xs text-foreground whitespace-nowrap pointer-events-none transition-opacity">
                        {displayText}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">STREAK</h2>
          <div className="bg-card rounded-lg p-6 text-center">
            <div className="flex justify-center mb-3">
              <Flame className="w-8 h-8 text-accent" />
            </div>
            <p className="text-4xl font-light text-foreground">{currentStreak}</p>
            <p className="text-xs text-muted-foreground mt-2">current</p>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-2xl font-light text-foreground">{longestStreak}</p>
              <p className="text-xs text-muted-foreground">longest</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground">TREND</h2>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1">
              {[7, 30, 90, 365].map((days) => (
                <button
                  key={days}
                  onClick={() => setTrendDays(days)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    trendDays === days
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {days === 7 ? 'Daily' : days === 30 ? 'Weekly' : days === 90 ? 'Monthly' : '1y'}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {(['bar', 'line', 'area'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                    chartType === type
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg p-6">
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'bar' && (
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px' }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: any) => `${(value / 60).toFixed(1)} h`}
                />
                <Bar dataKey="duration" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
            {chartType === 'line' && (
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px' }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: any) => `${(value / 60).toFixed(1)} h`}
                />
                <Line type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            )}
            {chartType === 'area' && (
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px' }}
                  labelStyle={{ color: '#ffffff' }}
                  formatter={(value: any) => `${(value / 60).toFixed(1)} h`}
                />
                <Area type="monotone" dataKey="duration" fill="#10b98133" stroke="#10b981" strokeWidth={2} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">TIME OF DAY</h2>
          <div className="bg-card rounded-lg p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={timeOfDayData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name.split(' ')[0]} ${(value / 60).toFixed(1)}h`}
                  outerRadius={80}
                  fill="#10b981"
                  dataKey="value"
                >
                  {timeOfDayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${(value / 60).toFixed(1)} h`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">CONSISTENCY</h2>
          <div className="bg-card rounded-lg p-6">
            <div className="flex flex-col items-center justify-center h-64">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#2a2a2a" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${(consistencyScore / 100) * 282.74} 282.74`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-light text-foreground">{consistencyScore}%</p>
                    <p className="text-xs text-muted-foreground mt-1">last 30 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">STATISTICS</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Average Session"
            value={`${Math.floor(stats.averageSessionLength / 60)}h ${stats.averageSessionLength % 60}m`}
          />
          <StatCard label="Average Daily" value={`${Math.floor(stats.averageDailyTime / 60)}h ${stats.averageDailyTime % 60}m`} />
          <StatCard label="Total Sessions" value={stats.totalSessions.toString()} />
          <StatCard label="Longest Session" value={`${Math.floor(stats.longestSession / 60)}h ${stats.longestSession % 60}m`} />
          <StatCard label="Total Time" value={`${Math.floor(stats.totalTime)}h`} />
          <StatCard label="Unique Days" value={new Set(sessions.map((s) => s.date)).size.toString()} />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <p className="text-2xl font-light text-foreground">{value}</p>
    </div>
  )
}
