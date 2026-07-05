export interface ProgressState {
  totalUnits: number
  completedUnits: number
  activeRequests: number
  startedAt: number | null
}

type Listener = (state: ProgressState) => void

class ProgressTracker {
  private state: ProgressState = { totalUnits: 0, completedUnits: 0, activeRequests: 0, startedAt: null }
  private listeners = new Set<Listener>()

  getState(): ProgressState {
    return this.state
  }

  reset() {
    this.state = { totalUnits: 0, completedUnits: 0, activeRequests: 0, startedAt: Date.now() }
    this.emit()
  }

  addTotal(n: number) {
    if (n <= 0) return
    this.state = { ...this.state, totalUnits: this.state.totalUnits + n }
    this.emit()
  }

  requestStarted() {
    this.state = { ...this.state, activeRequests: this.state.activeRequests + 1 }
    this.emit()
  }

  requestFinished() {
    this.state = {
      ...this.state,
      activeRequests: Math.max(0, this.state.activeRequests - 1),
      completedUnits: this.state.completedUnits + 1,
    }
    this.emit()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const l of this.listeners) l(this.state)
  }
}

export const progressTracker = new ProgressTracker()
