export type ModelId = 'deepseek-v4-flash' | 'deepseek-v4-pro'

export type FileFormat =
  | 'txt' | 'json' | 'xml' | 'csv' | 'yaml' | 'yml' | 'ini' | 'cfg'
  | 'properties' | 'strings' | 'lang' | 'lua' | 'js' | 'ts' | 'cs'
  | 'java' | 'kt' | 'renpy' | 'rpy' | 'po' | 'resx' | 'plist' | 'unknown'

export type FileStatus = 'pending' | 'translating' | 'done' | 'error' | 'canceled'

export interface ProjectFile {
  id: string
  name: string
  path: string // relative path (for zip entries)
  format: FileFormat
  originalContent: string
  translatedContent: string | null
  status: FileStatus
  progress: number // 0-100
  error?: string
  fromZip?: string // parent zip id
  isBinaryPassthrough?: boolean
}

export interface GlossaryEntry {
  id: string
  source: string
  target: string
  category: 'general' | 'character' | 'skill' | 'item' | 'place'
  note?: string
}

export interface TMEntry {
  id: string
  source: string
  target: string
  updatedAt: number
}

export type NameHandling = 'keep' | 'vietnamize' | 'hanviet'

export interface TranslationSettings {
  model: ModelId
  temperature: number
  topP: number
  maxTokens: number
  systemPromptOverride: string | null
  userPromptPrefix: string
  nameHandling: NameHandling
  translateSkillNames: boolean
  translateItemNames: boolean
  translatePlaceNames: boolean
  concurrency: number
}

export interface ChunkResult {
  index: number
  original: string
  translated: string
  ok: boolean
  error?: string
}
