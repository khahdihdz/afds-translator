const TM_KEY = 'afds:translation-memory'

type TMMap = Record<string, { target: string; updatedAt: number }>

function loadMap(): TMMap {
  try {
    const raw = localStorage.getItem(TM_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistMap(map: TMMap) {
  try {
    localStorage.setItem(TM_KEY, JSON.stringify(map))
  } catch {
    // storage full or unavailable — fail silently, TM is a cache not a source of truth
  }
}

function normalizeKey(source: string): string {
  return source.trim()
}

export function lookupTM(source: string): string | null {
  const map = loadMap()
  const key = normalizeKey(source)
  return map[key]?.target ?? null
}

export function saveTM(source: string, target: string): void {
  const map = loadMap()
  const key = normalizeKey(source)
  map[key] = { target, updatedAt: Date.now() }
  persistMap(map)
}

export function listTM(): { source: string; target: string; updatedAt: number }[] {
  const map = loadMap()
  return Object.entries(map)
    .map(([source, v]) => ({ source, target: v.target, updatedAt: v.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function clearTM(): void {
  persistMap({})
}

export function deleteTMEntry(source: string): void {
  const map = loadMap()
  delete map[normalizeKey(source)]
  persistMap(map)
}

export function tmCount(): number {
  return Object.keys(loadMap()).length
}
