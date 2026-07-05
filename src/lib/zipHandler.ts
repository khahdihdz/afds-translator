import JSZip from 'jszip'
import { detectFormat, isBinaryPassthrough } from './formats/detect'
import type { ProjectFile } from '../types'

const TEXT_EXTENSIONS = new Set([
  'txt', 'json', 'xml', 'csv', 'yaml', 'yml', 'ini', 'cfg', 'properties',
  'strings', 'lang', 'lua', 'js', 'ts', 'cs', 'java', 'kt', 'renpy', 'rpy',
  'po', 'resx', 'plist',
])

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export async function extractZip(zipFile: File, zipId: string): Promise<ProjectFile[]> {
  const zip = await JSZip.loadAsync(zipFile)
  const files: ProjectFile[] = []

  const entries = Object.values(zip.files).filter((e) => !e.dir)
  for (const entry of entries) {
    const ext = extOf(entry.name)
    const isText = TEXT_EXTENSIONS.has(ext)
    const format = detectFormat(entry.name)

    if (isText) {
      const content = await entry.async('string')
      files.push({
        id: `${zipId}::${entry.name}`,
        name: entry.name.split('/').pop() ?? entry.name,
        path: entry.name,
        format,
        originalContent: content,
        translatedContent: null,
        status: 'pending',
        progress: 0,
        fromZip: zipId,
        isBinaryPassthrough: false,
      })
    } else {
      // Keep binary/unsupported entries around (base64) so we can repack them untouched
      const base64 = await entry.async('base64')
      files.push({
        id: `${zipId}::${entry.name}`,
        name: entry.name.split('/').pop() ?? entry.name,
        path: entry.name,
        format: 'unknown',
        originalContent: base64,
        translatedContent: base64,
        status: 'done',
        progress: 100,
        fromZip: zipId,
        isBinaryPassthrough: true,
      })
    }
  }

  return files
}

export async function repackZip(files: ProjectFile[]): Promise<Blob> {
  const zip = new JSZip()
  for (const f of files) {
    const content = f.translatedContent ?? f.originalContent
    if (f.isBinaryPassthrough) {
      zip.file(f.path, content, { base64: true })
    } else {
      zip.file(f.path, content)
    }
  }
  return zip.generateAsync({ type: 'blob' })
}

export { isBinaryPassthrough }
