import { StudySession } from './storage'
import { startOfDay, endOfDay, subDays, subMonths, differenceInDays, format, parseISO } from 'date-fns'

export function getTodayTotal(sessions: StudySession[]): number {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todaySessions = sessions.filter((s) => s.date === today)
  return todaySessions.reduce((sum, s) => sum + s.durationSeconds, 0)
}

export function getWeekTotal(sessions: StudySession[], weeksAgo: number = 0): number {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() - weeksAgo * 7)
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return sessions
    .filter((s) => {
      const sessionDate = parseISO(s.startTime)
      return sessionDate >= startOfWeek && sessionDate <= endOfWeek
    })
    .reduce((sum, s) => sum + s.durationSeconds, 0)
}

export function getCurrentStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  const sessionsByDate = new Map<string, boolean>()
  sortedSessions.forEach((s) => {
    sessionsByDate.set(s.date, true)
  })

  while (true) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    if (sessionsByDate.has(dateStr)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

export function getLongestStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  const sessionsByDate = new Map<string, boolean>()
  sessions.forEach((s) => {
    sessionsByDate.set(s.date, true)
  })

  const dates = Array.from(sessionsByDate.keys())
    .sort()
    .map((d) => new Date(d + 'T00:00:00'))

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < dates.length; i++) {
    const diff = differenceInDays(dates[i], dates[i - 1])
    if (diff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else if (diff > 1) {
      currentStreak = 1
    }
  }

  return maxStreak
}

export function getHeatmapData(sessions: StudySession[]) {
  const now = new Date()
  const startDate = subMonths(now, 12)
  startDate.setHours(0, 0, 0, 0)

  const heatmapMap = new Map<string, number>()

  sessions.forEach((session) => {
    const existing = heatmapMap.get(session.date) || 0
    heatmapMap.set(session.date, existing + session.durationSeconds)
  })

  const data = []
  let current = new Date(startDate)

  while (current <= now) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const duration = heatmapMap.get(dateStr) || 0
    data.push({
      date: dateStr,
      duration,
    })
    current.setDate(current.getDate() + 1)
  }

  return data
}

export function getTrendData(
  sessions: StudySession[],
  days: number
): { date: string; duration: number }[] {
  const now = new Date()
  const startDate = subDays(now, days)
  startDate.setHours(0, 0, 0, 0)

  const trendMap = new Map<string, number>()

  sessions.forEach((session) => {
    const sessionDate = parseISO(session.startTime)
    if (sessionDate >= startDate && sessionDate <= now) {
      const dateStr = format(sessionDate, 'yyyy-MM-dd')
      const existing = trendMap.get(dateStr) || 0
      trendMap.set(dateStr, existing + session.durationSeconds)
    }
  })

  const data = []
  let current = new Date(startDate)

  while (current <= now) {
    const dateStr = format(current, 'yyyy-MM-dd')
    const duration = trendMap.get(dateStr) || 0
    data.push({
      date: format(current, 'MMM dd'),
      duration,
    })
    current.setDate(current.getDate() + 1)
  }

  return data
}

export function getTimeOfDayData(sessions: StudySession[]) {
  const buckets = {
    morning: 0, // 5-12
    afternoon: 0, // 12-17
    evening: 0, // 17-21
    night: 0, // 21-5
  }

  sessions.forEach((session) => {
    const hour = new Date(session.startTime).getHours()
    if (hour >= 5 && hour < 12) buckets.morning += session.durationSeconds
    else if (hour >= 12 && hour < 17) buckets.afternoon += session.durationSeconds
    else if (hour >= 17 && hour < 21) buckets.evening += session.durationSeconds
    else buckets.night += session.durationSeconds
  })

  return [
    { name: 'Morning (5-12)', value: Math.round(buckets.morning / 60) },
    { name: 'Afternoon (12-17)', value: Math.round(buckets.afternoon / 60) },
    { name: 'Evening (17-21)', value: Math.round(buckets.evening / 60) },
    { name: 'Night (21-5)', value: Math.round(buckets.night / 60) },
  ]
}

export function getConsistencyScore(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const sessionsByDate = new Set<string>()
  sessions.forEach((s) => {
    const sessionDate = parseISO(s.startTime)
    if (sessionDate >= thirtyDaysAgo && sessionDate <= now) {
      sessionsByDate.add(s.date)
    }
  })

  const daysInRange = 31
  return Math.round((sessionsByDate.size / daysInRange) * 100)
}

export function getStats(sessions: StudySession[]) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageSessionLength: 0,
      longestSession: 0,
      totalTime: 0,
      averageDailyTime: 0,
    }
  }

  const totalTime = sessions.reduce((sum, s) => sum + s.durationSeconds, 0)
  const averageSessionLength = Math.round(totalTime / sessions.length / 60)
  const longestSession = Math.max(...sessions.map((s) => s.durationSeconds))

  const uniqueDates = new Set(sessions.map((s) => s.date))
  const averageDailyTime = Math.round(totalTime / uniqueDates.size / 60)

  return {
    totalSessions: sessions.length,
    averageSessionLength,
    longestSession: Math.round(longestSession / 60),
    totalTime: Math.round(totalTime / 3600),
    averageDailyTime,
  }
}
