export type LogLevel = 'info' | 'success' | 'warning' | 'error'

export interface LogEntry {
  id: number
  time: number
  level: LogLevel
  message: string
}

type Listener = (entries: LogEntry[]) => void

const MAX_ENTRIES = 400

class LiveLog {
  private entries: LogEntry[] = []
  private listeners = new Set<Listener>()
  private nextId = 1

  getEntries(): LogEntry[] {
    return this.entries
  }

  add(level: LogLevel, message: string) {
    const entry: LogEntry = { id: this.nextId++, time: Date.now(), level, message }
    this.entries = this.entries.length >= MAX_ENTRIES ? [...this.entries.slice(1), entry] : [...this.entries, entry]
    this.emit()
  }

  clear() {
    this.entries = []
    this.emit()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.entries)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const l of this.listeners) l(this.entries)
  }
}

export const liveLog = new LiveLog()
