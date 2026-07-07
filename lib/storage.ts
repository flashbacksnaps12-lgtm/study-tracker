export interface StudySession {
  id: string
  date: string // YYYY-MM-DD
  startTime: string // ISO string
  endTime: string // ISO string
  durationSeconds: number
}

const STORAGE_KEY = 'studySessions'

export function getStoredSessions(): StudySession[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveSessions(sessions: StudySession[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    console.error('Failed to save sessions')
  }
}

export function addSession(session: StudySession): void {
  const sessions = getStoredSessions()
  sessions.push(session)
  saveSessions(sessions)
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
