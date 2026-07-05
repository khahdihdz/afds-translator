import { useEffect, useState } from 'react'
import { liveLog, type LogEntry } from '../lib/liveLog'

export function useLiveLog(): LogEntry[] {
  const [entries, setEntries] = useState<LogEntry[]>(liveLog.getEntries())

  useEffect(() => {
    return liveLog.subscribe(setEntries)
  }, [])

  return entries
}
