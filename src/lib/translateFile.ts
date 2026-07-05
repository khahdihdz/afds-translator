import type { ProjectFile, TranslationSettings, GlossaryEntry } from '../types'
import { XML_LIKE } from './formats/detect'
import { translateJson } from './formats/json'
import { translateXml } from './formats/xml'
import { translatePo } from './formats/po'
import { translatePlainText } from './formats/plain'
import { validateJson, validateXml } from './validators'

export interface TranslateFileOutcome {
  translatedContent: string
  warnings: string[]
}

export async function translateProjectFile(
  file: ProjectFile,
  apiKey: string,
  settings: TranslationSettings,
  glossary: GlossaryEntry[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<TranslateFileOutcome> {
  const warnings: string[] = []
  const fileLabel = file.path

  if (file.format === 'json') {
    const translated = await translateJson(file.originalContent, apiKey, settings, glossary, onProgress, signal, fileLabel)
    const check = validateJson(translated)
    if (!check.ok) warnings.push(...check.issues)
    return { translatedContent: translated, warnings }
  }

  if (XML_LIKE.includes(file.format)) {
    const translated = await translateXml(file.originalContent, apiKey, settings, glossary, onProgress, signal, fileLabel)
    const check = validateXml(translated)
    if (!check.ok) warnings.push(...check.issues)
    return { translatedContent: translated, warnings }
  }

  if (file.format === 'po') {
    const translated = await translatePo(file.originalContent, apiKey, settings, glossary, onProgress, signal, fileLabel)
    return { translatedContent: translated, warnings }
  }

  // Default: line-based generic text (txt, csv, yaml, ini, lua, renpy, js/ts/cs/java/kt, etc.)
  const result = await translatePlainText(file.originalContent, apiKey, settings, glossary, onProgress, signal, fileLabel)
  return { translatedContent: result.text, warnings: result.warnings }
}
