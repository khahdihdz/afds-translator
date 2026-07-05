import type { TranslationSettings, GlossaryEntry } from '../../types'
import { maskProtectedTokens, restoreProtectedTokens } from '../placeholders'
import { chunkUnits, splitUnits } from '../chunking'
import { translateChunk } from '../deepseek'
import { buildSystemPrompt } from '../systemPrompt'
import { lookupTM, saveTM } from '../translationMemory'
import { progressTracker } from '../progressTracker'

// Heuristic: skip strings that look like identifiers/paths/codes rather than
// player-facing text (e.g. "en_US", "assets/img/x.png", "0xFF00", GUIDs).
function looksTranslatable(value: string): boolean {
  const v = value.trim()
  if (v.length === 0) return false
  if (v.length > 4000) return false
  if (/^[A-Za-z0-9_\-./\\:]+$/.test(v) && !/[ ]/.test(v)) return false // path/id-like, no spaces
  if (/^[0-9a-fA-F-]{8,}$/.test(v)) return false // hash/guid-like
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return false // color hex
  return true
}

interface LeafRef {
  path: (string | number)[]
  value: string
}

function collectLeaves(node: unknown, path: (string | number)[], out: LeafRef[]) {
  if (typeof node === 'string') {
    if (looksTranslatable(node)) out.push({ path, value: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectLeaves(item, [...path, i], out))
    return
  }
  if (node && typeof node === 'object') {
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      collectLeaves(val, [...path, key], out)
    }
  }
}

function setAtPath(root: unknown, path: (string | number)[], value: string) {
  let cur: any = root
  for (let i = 0; i < path.length - 1; i += 1) {
    cur = cur[path[i]]
  }
  cur[path[path.length - 1]] = value
}

export interface TranslateProgressCb {
  (completed: number, total: number): void
}

export async function translateJson(
  rawContent: string,
  apiKey: string,
  settings: TranslationSettings,
  glossary: GlossaryEntry[],
  onProgress?: TranslateProgressCb,
  signal?: AbortSignal
): Promise<string> {
  const parsed = JSON.parse(rawContent)
  const leaves: LeafRef[] = []
  collectLeaves(parsed, [], leaves)

  const systemPrompt = buildSystemPrompt(settings, glossary)

  // Resolve from Translation Memory first
  const toTranslate: { leafIndex: number; masked: string; map: Map<string, string> }[] = []
  const values = leaves.map((l) => l.value)
  const resolved: (string | null)[] = values.map((v) => lookupTM(v))

  values.forEach((val, i) => {
    if (resolved[i] === null) {
      const { masked, map } = maskProtectedTokens(val)
      toTranslate.push({ leafIndex: i, masked, map })
    }
  })

  const units = toTranslate.map((t) => t.masked)
  const groups = chunkUnits(units, 4800)

  let completed = 0
  const total = groups.length || 1
  progressTracker.addTotal(groups.length)

  await Promise.all(
    groups.map(async (group) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const groupUnits = group.indices.map((i) => units[i])
      const userPrompt = `Dịch các đoạn văn bản sau sang tiếng Việt. Mỗi đoạn cách nhau bởi dòng phân cách "⁣⁣UNIT_SEP⁣⁣" — giữ nguyên số lượng đoạn và thứ tự, không gộp, không thêm bớt đoạn:\n\n${group.text}`

      const translatedText = await translateChunk({ systemPrompt, userPrompt, apiKey, settings, signal })
      const splitResult = splitUnits(translatedText, groupUnits.length)

      group.indices.forEach((unitIdx, i) => {
        const entry = toTranslate[unitIdx]
        const translatedRaw = splitResult[i] ?? groupUnits[i]
        const restored = restoreProtectedTokens(translatedRaw.trim(), entry.map)
        resolved[entry.leafIndex] = restored
        saveTM(values[entry.leafIndex], restored)
      })

      completed += 1
      onProgress?.(completed, total)
    })
  )

  leaves.forEach((leaf, i) => {
    const finalValue = resolved[i] ?? leaf.value
    setAtPath(parsed, leaf.path, finalValue)
  })

  return JSON.stringify(parsed, null, 2)
}
