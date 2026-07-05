import type { TranslationSettings, GlossaryEntry } from '../../types'
import { maskProtectedTokens, restoreProtectedTokens, validatePlaceholdersPreserved } from '../placeholders'
import { chunkByLines } from '../chunking'
import { translateChunk } from '../deepseek'
import { buildSystemPrompt } from '../systemPrompt'
import { lookupTM, saveTM } from '../translationMemory'
import { progressTracker } from '../progressTracker'
import { liveLog } from '../liveLog'

export interface TranslateProgressCb {
  (completed: number, total: number): void
}

export interface TranslateResult {
  text: string
  warnings: string[]
}

export async function translatePlainText(
  rawContent: string,
  apiKey: string,
  settings: TranslationSettings,
  glossary: GlossaryEntry[],
  onProgress?: TranslateProgressCb,
  signal?: AbortSignal,
  fileLabel: string = 'Tệp'
): Promise<TranslateResult> {
  const systemPrompt = buildSystemPrompt(settings, glossary)
  const chunks = chunkByLines(rawContent, 4200)
  const warnings: string[] = []
  const outputs: string[] = new Array(chunks.length)

  let completed = 0
  const total = chunks.length || 1
  const needsTranslation = chunks.filter((c) => {
    const cached = lookupTM(c.text)
    return !(cached && cached.split('\n').length === c.lineCount)
  })
  progressTracker.addTotal(needsTranslation.length)
  liveLog.add('info', `${fileLabel}: ${chunks.length} đoạn (${needsTranslation.length} cần dịch, ${chunks.length - needsTranslation.length} lấy từ bộ nhớ dịch)`)

  await Promise.all(
    chunks.map(async (chunk) => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const cached = lookupTM(chunk.text)
      if (cached && cached.split('\n').length === chunk.lineCount) {
        outputs[chunk.index] = cached
        completed += 1
        onProgress?.(completed, total)
        return
      }

      const label = `${fileLabel} · đoạn ${chunk.index + 1}/${chunks.length}`
      const { masked, map } = maskProtectedTokens(chunk.text)
      const userPrompt = `Dịch đoạn văn bản sau sang tiếng Việt, giữ nguyên số dòng và định dạng gốc:\n\n${masked}`
      liveLog.add('info', `${label}: đang gửi...`)
      const translatedRaw = await translateChunk({ systemPrompt, userPrompt, apiKey, settings, signal, label })
      let restored = restoreProtectedTokens(translatedRaw, map)

      const missing = validatePlaceholdersPreserved(chunk.text, restored)
      if (missing.length > 0) {
        warnings.push(`Chunk ${chunk.index + 1}: thiếu placeholder ${missing.join(', ')} — đã tự động khôi phục từ bản gốc.`)
        liveLog.add('warning', `${label}: thiếu placeholder ${missing.join(', ')}, đã tự khôi phục`)
        restored = restoreProtectedTokens(masked, map)
      }

      const gotLines = restored.split('\n').length
      if (gotLines !== chunk.lineCount) {
        warnings.push(`Chunk ${chunk.index + 1}: số dòng thay đổi (${chunk.lineCount} → ${gotLines}).`)
        liveLog.add('warning', `${label}: số dòng thay đổi (${chunk.lineCount} → ${gotLines})`)
      }

      outputs[chunk.index] = restored
      saveTM(chunk.text, restored)
      liveLog.add('success', `${label}: hoàn tất`)

      completed += 1
      onProgress?.(completed, total)
    })
  )

  return { text: outputs.join('\n'), warnings }
}
