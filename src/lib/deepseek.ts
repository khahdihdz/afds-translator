import type { TranslationSettings } from '../types'
import { globalScheduler } from './scheduler'
import { progressTracker } from './progressTracker'
import { liveLog } from './liveLog'

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
  label?: string
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

const MAX_RETRIES = 5
const RETRY_BASE_DELAY_MS = 1200
const RETRY_MAX_DELAY_MS = 20000

// 401/403: API Key invalid — retrying never helps.
// 400/404/422: malformed request — retrying the same payload won't help either.
// Everything else (429 rate-limited, 5xx server/capacity errors, network errors) is transient and worth retrying.
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422])
const CAPACITY_STATUSES = new Set([429, 503])

function isCapacityError(err: unknown): boolean {
  return err instanceof TranslationApiError && err.status !== undefined && CAPACITY_STATUSES.has(err.status)
}

function backoffDelay(attempt: number, capacity: boolean): number {
  const base = capacity ? RETRY_BASE_DELAY_MS * 1.8 : RETRY_BASE_DELAY_MS
  const raw = base * 2 ** attempt
  const jitter = raw * (0.75 + Math.random() * 0.5) // ±25% jitter to avoid synchronized retry storms
  return Math.min(RETRY_MAX_DELAY_MS, jitter)
}

// When the upstream reports "no available channel" (503) or rate-limits us
// (429), every in-flight chunk hitting the same wall at once just wastes
// retries. This shared cooldown makes all of them briefly stand down together
// instead of hammering an already-overloaded pool.
let capacityCooldownUntil = 0

function noteCapacityError(delayMs: number) {
  capacityCooldownUntil = Math.max(capacityCooldownUntil, Date.now() + delayMs)
}

async function waitForCapacityCooldown(signal?: AbortSignal): Promise<void> {
  const wait = capacityCooldownUntil - Date.now()
  if (wait > 0) await sleep(wait, signal)
}

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
    await waitForCapacityCooldown(params.signal)
    try {
      return await callOnce(params)
    } catch (err) {
      lastError = err
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
      const errMsg = err instanceof Error ? err.message : String(err)

      if (err instanceof TranslationApiError && err.status !== undefined && NON_RETRYABLE_STATUSES.has(err.status)) {
        const reason = err.status === 401 || err.status === 403 ? 'lỗi xác thực API Key' : 'yêu cầu không hợp lệ'
        liveLog.add('error', `${params.label ?? 'Yêu cầu'}: ${reason} — ${errMsg}`)
        throw err
      }

      const capacity = isCapacityError(err)
      if (attempt < MAX_RETRIES) {
        const delay = backoffDelay(attempt, capacity)
        if (capacity) noteCapacityError(delay)
        const reason = capacity ? 'máy chủ AI đang quá tải (không còn kênh xử lý)' : 'lỗi tạm thời'
        liveLog.add(
          'warning',
          `${params.label ?? 'Yêu cầu'}: ${reason} (${errMsg}), thử lại lần ${attempt + 1}/${MAX_RETRIES} sau ${(delay / 1000).toFixed(1)}s...`
        )
        await sleep(delay, params.signal)
      } else {
        liveLog.add('error', `${params.label ?? 'Yêu cầu'}: thất bại sau ${MAX_RETRIES} lần thử — ${errMsg}`)
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
