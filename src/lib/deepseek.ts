import type { TranslationSettings } from '../types'
import { globalScheduler } from './scheduler'
import { progressTracker } from './progressTracker'

const BASE_URL = 'https://api.vilao.ai/v1'

export class TranslationApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TranslationApiError'
    this.status = status
  }
}

export interface TranslateChunkParams {
  systemPrompt: string
  userPrompt: string
  apiKey: string
  settings: TranslationSettings
  signal?: AbortSignal
}

async function callOnce(params: TranslateChunkParams): Promise<string> {
  const { systemPrompt, userPrompt, apiKey, settings, signal } = params

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new TranslationApiError(`API lỗi (${res.status}): ${text || res.statusText}`, res.status)
  }

  const data = await res.json()
  const content: string | undefined = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new TranslationApiError('Phản hồi API không hợp lệ (thiếu nội dung).')
  }
  return content
}

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

async function translateChunkWithRetry(params: TranslateChunkParams): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await callOnce(params)
    } catch (err) {
      lastError = err
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
      // Don't retry on auth errors (401/403) - won't help
      if (err instanceof TranslationApiError && (err.status === 401 || err.status === 403)) {
        throw err
      }
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt, params.signal)
      }
    }
  }
  throw lastError
}

// Public entry point used everywhere a chunk needs translating. Every call is
// gated by the global concurrency scheduler (so "concurrency" in Settings is
// the real number of simultaneous HTTP requests, across all files/chunks at
// once) and reported to the live progress tracker for the UI progress bar.
export async function translateChunk(params: TranslateChunkParams): Promise<string> {
  return globalScheduler.run(async () => {
    progressTracker.requestStarted()
    try {
      return await translateChunkWithRetry(params)
    } finally {
      progressTracker.requestFinished()
    }
  })
}

// Simple concurrency-limited queue runner, with per-item cancel support via a shared AbortController.
export async function runQueue<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  let completed = 0

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await worker(items[current], current)
      completed += 1
      onProgress?.(completed, items.length)
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => runWorker())
  await Promise.all(workers)
  return results
}
