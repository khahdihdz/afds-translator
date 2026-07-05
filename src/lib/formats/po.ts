import type { TranslationSettings, GlossaryEntry } from '../../types'
import { maskProtectedTokens, restoreProtectedTokens } from '../placeholders'
import { chunkUnits, splitUnits } from '../chunking'
import { translateChunk } from '../deepseek'
import { buildSystemPrompt } from '../systemPrompt'
import { lookupTM, saveTM } from '../translationMemory'
import { progressTracker } from '../progressTracker'
import { liveLog } from '../liveLog'

interface PoEntry {
  msgidLine: number
  msgid: string
  msgstrLine: number
  msgstr: string
}

function unquote(line: string): string {
  const m = line.match(/"((?:[^"\\]|\\.)*)"/)
  return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''
}

function quote(text: string): string {
  return `"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
}

export async function translatePo(
  rawContent: string,
  apiKey: string,
  settings: TranslationSettings,
  glossary: GlossaryEntry[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
  fileLabel: string = 'Tệp'
): Promise<string> {
  const lines = rawContent.split('\n')
  const entries: PoEntry[] = []

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('msgid ') && !lines[i].startsWith('msgid_plural')) {
      const msgid = unquote(lines[i])
      let j = i + 1
      while (lines[j] && lines[j].startsWith('msgstr ')) break
      // find msgstr line following (skip multi-line msgid continuation quotes)
      let k = i + 1
      let fullMsgid = msgid
      while (lines[k] && lines[k].trim().startsWith('"')) {
        fullMsgid += unquote(lines[k])
        k += 1
      }
      if (lines[k] && lines[k].startsWith('msgstr ')) {
        const msgstr = unquote(lines[k])
        entries.push({ msgidLine: i, msgid: fullMsgid, msgstrLine: k, msgstr })
      }
    }
  }

  const systemPrompt = buildSystemPrompt(settings, glossary)
  const translatable = entries.filter((e) => e.msgid.trim().length > 0)
  const resolved: (string | null)[] = translatable.map((e) => lookupTM(e.msgid))
  const toTranslate = translatable
    .map((e, i) => ({ i, e }))
    .filter(({ i }) => resolved[i] === null)

  const maskedList = toTranslate.map(({ e }) => maskProtectedTokens(e.msgid))
  const units = maskedList.map((x) => x.masked)
  const groups = chunkUnits(units, 4800)

  let completed = 0
  const total = groups.length || 1
  progressTracker.addTotal(groups.length)
  liveLog.add('info', `${fileLabel}: ${translatable.length} chuỗi gettext, gộp thành ${groups.length} lượt gọi API`)

  await Promise.all(
    groups.map(async (group, gi) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const label = `${fileLabel} · lượt ${gi + 1}/${groups.length}`
      liveLog.add('info', `${label}: đang dịch...`)
      const userPrompt = `Dịch các chuỗi gettext (.po) sau sang tiếng Việt. Mỗi chuỗi cách nhau bởi "⁣⁣UNIT_SEP⁣⁣", giữ nguyên số lượng và thứ tự:\n\n${group.text}`
      const translatedText = await translateChunk({ systemPrompt, userPrompt, apiKey, settings, signal, label })
      const splitResult = splitUnits(translatedText, group.indices.length)

      group.indices.forEach((localIdx, i) => {
        const globalIdx = toTranslate[localIdx].i
        const translatedRaw = splitResult[i] ?? units[localIdx]
        const restored = restoreProtectedTokens(translatedRaw.trim(), maskedList[localIdx].map)
        resolved[globalIdx] = restored
        saveTM(translatable[globalIdx].msgid, restored)
      })

      liveLog.add('success', `${label}: hoàn tất`)
      completed += 1
      onProgress?.(completed, total)
    })
  )

  const outLines = [...lines]
  translatable.forEach((entry, i) => {
    const finalText = resolved[i] ?? entry.msgstr
    outLines[entry.msgstrLine] = `msgstr ${quote(finalText)}`
  })

  return outLines.join('\n')
}
