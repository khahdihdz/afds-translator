import type { TranslationSettings, GlossaryEntry } from '../../types'
import { maskProtectedTokens, restoreProtectedTokens } from '../placeholders'
import { chunkUnits, splitUnits } from '../chunking'
import { translateChunk } from '../deepseek'
import { buildSystemPrompt } from '../systemPrompt'
import { lookupTM, saveTM } from '../translationMemory'
import { progressTracker } from '../progressTracker'

// Matches text content strictly between > and < (i.e. element text nodes),
// skipping tags, attributes, comments and CDATA markers themselves.
const TEXT_NODE_RE = />([^<>]+)</g

function isTranslatableTextNode(text: string): boolean {
  const t = text.trim()
  if (t.length === 0) return false
  if (/^[0-9.\-:]+$/.test(t)) return false // pure numbers/dates
  return true
}

export async function translateXml(
  rawContent: string,
  apiKey: string,
  settings: TranslationSettings,
  glossary: GlossaryEntry[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const systemPrompt = buildSystemPrompt(settings, glossary)

  const matches: { fullMatch: string; text: string; index: number }[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(TEXT_NODE_RE)
  while ((m = re.exec(rawContent)) !== null) {
    const text = m[1]
    if (isTranslatableTextNode(text)) {
      matches.push({ fullMatch: m[0], text, index: m.index })
    }
  }

  const resolved: (string | null)[] = matches.map((mm) => lookupTM(mm.text))
  const toTranslate = matches
    .map((mm, i) => ({ i, mm }))
    .filter(({ i }) => resolved[i] === null)

  const maskedList = toTranslate.map(({ mm }) => maskProtectedTokens(mm.text))
  const units = maskedList.map((x) => x.masked)
  const groups = chunkUnits(units, 4800)

  let completed = 0
  const total = groups.length || 1
  progressTracker.addTotal(groups.length)

  await Promise.all(
    groups.map(async (group) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const userPrompt = `Dịch các đoạn văn bản XML sau sang tiếng Việt. Mỗi đoạn cách nhau bởi dòng phân cách "⁣⁣UNIT_SEP⁣⁣" — giữ nguyên số lượng và thứ tự đoạn:\n\n${group.text}`
      const translatedText = await translateChunk({ systemPrompt, userPrompt, apiKey, settings, signal })
      const splitResult = splitUnits(translatedText, group.indices.length)

      group.indices.forEach((localIdx, i) => {
        const globalIdx = toTranslate[localIdx].i
        const translatedRaw = splitResult[i] ?? units[localIdx]
        const restored = restoreProtectedTokens(translatedRaw.trim(), maskedList[localIdx].map)
        resolved[globalIdx] = restored
        saveTM(matches[globalIdx].text, restored)
      })

      completed += 1
      onProgress?.(completed, total)
    })
  )

  // Rebuild the document by replacing text nodes back-to-front (so indices stay valid)
  let result = rawContent
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const finalText = resolved[i] ?? matches[i].text
    const replacement = `>${finalText}<`
    result = result.slice(0, matches[i].index) + replacement + result.slice(matches[i].index + matches[i].fullMatch.length)
  }

  return result
}
