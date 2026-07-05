import type { FileFormat } from '../../types'

const EXT_MAP: Record<string, FileFormat> = {
  txt: 'txt',
  json: 'json',
  xml: 'xml',
  csv: 'csv',
  yaml: 'yaml',
  yml: 'yml',
  ini: 'ini',
  cfg: 'cfg',
  properties: 'properties',
  strings: 'strings',
  lang: 'lang',
  lua: 'lua',
  js: 'js',
  ts: 'ts',
  cs: 'cs',
  java: 'java',
  kt: 'kt',
  renpy: 'renpy',
  rpy: 'rpy',
  po: 'po',
  resx: 'resx',
  plist: 'plist',
}

// Formats treated as XML-structured under the hood
export const XML_LIKE: FileFormat[] = ['xml', 'resx', 'plist']
// Formats treated as line-based generic text
export const LINE_BASED: FileFormat[] = [
  'txt', 'csv', 'yaml', 'yml', 'ini', 'cfg', 'properties', 'strings', 'lang',
  'lua', 'js', 'ts', 'cs', 'java', 'kt', 'renpy', 'rpy',
]

export function detectFormat(fileName: string): FileFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MAP[ext] ?? 'unknown'
}

export function isArchive(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ext === 'zip'
}

// .mo, .xlsx, .rar, .7z are binary containers we cannot safely text-diff/translate
// in the browser without heavier native deps; we pass them through untouched
// and surface that clearly in the UI rather than silently corrupting them.
export function isBinaryPassthrough(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  return ['mo', 'xlsx', 'rar', '7z'].includes(ext)
}
