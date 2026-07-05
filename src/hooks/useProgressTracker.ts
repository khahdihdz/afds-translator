import { useEffect, useState } from 'react'
import { progressTracker, type ProgressState } from '../lib/progressTracker'

export function useProgressTracker(): ProgressState {
  const [state, setState] = useState<ProgressState>(progressTracker.getState())

  useEffect(() => {
    return progressTracker.subscribe(setState)
  }, [])

  return state
}
