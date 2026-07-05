import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectFile, GlossaryEntry, TranslationSettings, FileStatus } from '../types'
import { detectFormat, isArchive, isBinaryPassthrough } from '../lib/formats/detect'
import { extractZip, repackZip } from '../lib/zipHandler'
import { translateProjectFile } from '../lib/translateFile'
import { globalScheduler } from '../lib/scheduler'
import { progressTracker } from '../lib/progressTracker'
import { liveLog } from '../lib/liveLog'

interface AppState {
  apiKey: string
  setApiKey: (key: string) => void

  settings: TranslationSettings
  updateSettings: (partial: Partial<TranslationSettings>) => void

  glossary: GlossaryEntry[]
  addGlossaryEntry: (entry: Omit<GlossaryEntry, 'id'>) => void
  removeGlossaryEntry: (id: string) => void
  updateGlossaryEntry: (id: string, partial: Partial<GlossaryEntry>) => void
  importGlossary: (entries: Omit<GlossaryEntry, 'id'>[]) => void

  files: ProjectFile[]
  addFiles: (fileList: File[]) => Promise<void>
  removeFile: (id: string) => void
  clearFiles: () => void
  updateFileContent: (id: string, translatedContent: string) => void

  activeFileId: string | null
  setActiveFileId: (id: string | null) => void

  isTranslating: boolean
  abortController: AbortController | null
  translateAll: () => Promise<void>
  translateOne: (id: string) => Promise<void>
  cancelTranslation: () => void

  downloadAllAsZip: () => Promise<void>
}

const defaultSettings: TranslationSettings = {
  model: 'deepseek-v4-flash',
  temperature: 0.6,
  topP: 0.9,
  maxTokens: 4096,
  systemPromptOverride: null,
  userPromptPrefix: '',
  nameHandling: 'keep',
  translateSkillNames: true,
  translateItemNames: true,
  translatePlaceNames: false,
  concurrency: 5,
}

const defaultGlossary: GlossaryEntry[] = [
  { id: 'g1', source: 'Mana', target: 'Ma lực', category: 'general' },
  { id: 'g2', source: 'Save', target: 'Lưu', category: 'general' },
  { id: 'g3', source: 'Load', target: 'Tải', category: 'general' },
  { id: 'g4', source: 'Quest', target: 'Nhiệm vụ', category: 'general' },
  { id: 'g5', source: 'HP', target: 'HP', category: 'general' },
  { id: 'g6', source: 'MP', target: 'MP', category: 'general' },
  { id: 'g7', source: 'EXP', target: 'Kinh nghiệm', category: 'general' },
]

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function setStatus(files: ProjectFile[], id: string, status: FileStatus, progress?: number, error?: string): ProjectFile[] {
  return files.map((f) => (f.id === id ? { ...f, status, progress: progress ?? f.progress, error } : f))
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key }),

      settings: defaultSettings,
      updateSettings: (partial) =>
        set((s) => {
          const next = { ...s.settings, ...partial }
          if (partial.concurrency) globalScheduler.setConcurrency(partial.concurrency)
          return { settings: next }
        }),

      glossary: defaultGlossary,
      addGlossaryEntry: (entry) => set((s) => ({ glossary: [...s.glossary, { ...entry, id: genId() }] })),
      removeGlossaryEntry: (id) => set((s) => ({ glossary: s.glossary.filter((g) => g.id !== id) })),
      updateGlossaryEntry: (id, partial) =>
        set((s) => ({ glossary: s.glossary.map((g) => (g.id === id ? { ...g, ...partial } : g)) })),
      importGlossary: (entries) =>
        set((s) => ({ glossary: [...s.glossary, ...entries.map((e) => ({ ...e, id: genId() }))] })),

      files: [],
      addFiles: async (fileList) => {
        const newFiles: ProjectFile[] = []
        for (const file of fileList) {
          if (isArchive(file.name)) {
            const zipId = genId()
            const extracted = await extractZip(file, zipId)
            newFiles.push(...extracted)
          } else if (isBinaryPassthrough(file.name)) {
            const text = await file.arrayBuffer()
            const base64 = btoa(String.fromCharCode(...new Uint8Array(text)))
            newFiles.push({
              id: genId(),
              name: file.name,
              path: file.name,
              format: 'unknown',
              originalContent: base64,
              translatedContent: base64,
              status: 'done',
              progress: 100,
              isBinaryPassthrough: true,
            })
          } else {
            const content = await file.text()
            newFiles.push({
              id: genId(),
              name: file.name,
              path: file.name,
              format: detectFormat(file.name),
              originalContent: content,
              translatedContent: null,
              status: 'pending',
              progress: 0,
            })
          }
        }
        set((s) => ({ files: [...s.files, ...newFiles] }))
        liveLog.add('info', `Đã thêm ${newFiles.length} tệp (${fileList.map((f) => f.name).join(', ')})`)
        if (!get().activeFileId && newFiles.length > 0) {
          const firstEditable = newFiles.find((f) => !f.isBinaryPassthrough)
          if (firstEditable) set({ activeFileId: firstEditable.id })
        }
      },
      removeFile: (id) =>
        set((s) => {
          const f = s.files.find((x) => x.id === id)
          if (f) liveLog.add('info', `Đã xoá: ${f.path}`)
          return { files: s.files.filter((f) => f.id !== id) }
        }),
      clearFiles: () => {
        liveLog.add('info', 'Đã xoá toàn bộ danh sách tệp')
        set({ files: [], activeFileId: null })
      },
      updateFileContent: (id, translatedContent) =>
        set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, translatedContent } : f)) })),

      activeFileId: null,
      setActiveFileId: (id) => set({ activeFileId: id }),

      isTranslating: false,
      abortController: null,

      translateOne: async (id) => {
        const { apiKey, settings, glossary } = get()
        if (!apiKey) {
          set((s) => ({ files: setStatus(s.files, id, 'error', undefined, 'Thiếu API Key. Vui lòng nhập trong Cài đặt.') }))
          return
        }
        globalScheduler.setConcurrency(settings.concurrency)
        progressTracker.reset()
        const controller = new AbortController()
        set({ abortController: controller, isTranslating: true })
        set((s) => ({ files: setStatus(s.files, id, 'translating', 0) }))

        try {
          const file = get().files.find((f) => f.id === id)
          if (!file || file.isBinaryPassthrough) return
          liveLog.add('info', `Bắt đầu dịch: ${file.path}`)

          const outcome = await translateProjectFile(
            file,
            apiKey,
            settings,
            glossary,
            (completed, total) => {
              const pct = Math.round((completed / Math.max(1, total)) * 100)
              set((s) => ({ files: setStatus(s.files, id, 'translating', pct) }))
            },
            controller.signal
          )

          liveLog.add('success', `Hoàn tất: ${file.path}${outcome.warnings.length > 0 ? ` (${outcome.warnings.length} cảnh báo)` : ''}`)
          set((s) => ({
            files: s.files.map((f) =>
              f.id === id
                ? {
                    ...f,
                    translatedContent: outcome.translatedContent,
                    status: 'done' as FileStatus,
                    progress: 100,
                    error: outcome.warnings.length > 0 ? outcome.warnings.join(' | ') : undefined,
                  }
                : f
            ),
          }))
        } catch (err) {
          const isAbort = err instanceof DOMException && err.name === 'AbortError'
          liveLog.add(isAbort ? 'warning' : 'error', `${isAbort ? 'Đã huỷ' : 'Lỗi'}: ${(err as Error).message ?? ''}`)
          set((s) => ({
            files: setStatus(s.files, id, isAbort ? 'canceled' : 'error', undefined, isAbort ? undefined : (err as Error).message),
          }))
        } finally {
          set({ isTranslating: false, abortController: null })
        }
      },

      translateAll: async () => {
        const { apiKey, settings, glossary, files } = get()
        if (!apiKey) return
        globalScheduler.setConcurrency(settings.concurrency)
        progressTracker.reset()
        const controller = new AbortController()
        set({ abortController: controller, isTranslating: true })

        const targets = files.filter((f) => !f.isBinaryPassthrough && f.status !== 'done')
        targets.forEach((f) => set((s) => ({ files: setStatus(s.files, f.id, 'translating', 0) })))
        liveLog.add('info', `Bắt đầu dịch ${targets.length} tệp (tối đa ${settings.concurrency} luồng song song)`)

        // Files are launched together; the shared global scheduler (not this
        // Promise.all) is what actually caps simultaneous network requests,
        // so a handful of small files and one huge file all share the same pool.
        await Promise.all(
          targets.map(async (file) => {
            try {
              liveLog.add('info', `Bắt đầu dịch: ${file.path}`)
              const outcome = await translateProjectFile(
                file,
                apiKey,
                settings,
                glossary,
                (completed, total) => {
                  const pct = Math.round((completed / Math.max(1, total)) * 100)
                  set((s) => ({ files: setStatus(s.files, file.id, 'translating', pct) }))
                },
                controller.signal
              )
              liveLog.add('success', `Hoàn tất: ${file.path}${outcome.warnings.length > 0 ? ` (${outcome.warnings.length} cảnh báo)` : ''}`)
              set((s) => ({
                files: s.files.map((f) =>
                  f.id === file.id
                    ? {
                        ...f,
                        translatedContent: outcome.translatedContent,
                        status: 'done' as FileStatus,
                        progress: 100,
                        error: outcome.warnings.length > 0 ? outcome.warnings.join(' | ') : undefined,
                      }
                    : f
                ),
              }))
            } catch (err) {
              const isAbort = err instanceof DOMException && err.name === 'AbortError'
              liveLog.add(isAbort ? 'warning' : 'error', `${isAbort ? 'Đã huỷ' : 'Lỗi'}: ${file.path}${!isAbort ? ` — ${(err as Error).message}` : ''}`)
              set((s) => ({
                files: setStatus(s.files, file.id, isAbort ? 'canceled' : 'error', undefined, isAbort ? undefined : (err as Error).message),
              }))
            }
          })
        )

        liveLog.add('info', `Đã xử lý xong ${targets.length} tệp`)
        set({ isTranslating: false, abortController: null })
      },

      cancelTranslation: () => {
        liveLog.add('warning', 'Người dùng huỷ quá trình dịch')
        get().abortController?.abort()
        set({ isTranslating: false })
      },

      downloadAllAsZip: async () => {
        const { files } = get()
        if (files.length === 0) return
        liveLog.add('info', `Đang đóng gói ${files.length} tệp thành ZIP...`)
        const blob = await repackZip(files)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'afds-translated.zip'
        a.click()
        URL.revokeObjectURL(url)
        liveLog.add('success', 'Đã tải xuống afds-translated.zip')
      },
    }),
    {
      name: 'afds-app-store',
      partialize: (s) => ({ apiKey: s.apiKey, settings: s.settings, glossary: s.glossary }),
    }
  )
)
