import { useMemo, useState } from 'react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import { FileText, GitCompare, Columns2, Play } from 'lucide-react'
import clsx from 'clsx'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { StatusBadge } from '../common/Progress'
import { useAppStore } from '../../store/useAppStore'

function monacoLangFor(format: string): string {
  if (format === 'json') return 'json'
  if (['xml', 'resx', 'plist'].includes(format)) return 'xml'
  if (format === 'js') return 'javascript'
  if (format === 'ts') return 'typescript'
  if (format === 'cs') return 'csharp'
  if (format === 'java') return 'java'
  if (format === 'kt') return 'kotlin'
  if (format === 'lua') return 'lua'
  if (format === 'yaml' || format === 'yml') return 'yaml'
  if (format === 'ini' || format === 'cfg') return 'ini'
  return 'plaintext'
}

export function EditorPage() {
  const files = useAppStore((s) => s.files)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const updateFileContent = useAppStore((s) => s.updateFileContent)
  const translateOne = useAppStore((s) => s.translateOne)
  const apiKey = useAppStore((s) => s.apiKey)

  const [mode, setMode] = useState<'split' | 'diff'>('split')

  const editableFiles = useMemo(() => files.filter((f) => !f.isBinaryPassthrough), [files])
  const activeFile = files.find((f) => f.id === activeFileId) ?? editableFiles[0]

  if (!activeFile) {
    return (
      <GlassPanel className="p-10 text-center text-[var(--color-muted)]">
        <FileText size={28} className="mx-auto mb-3 opacity-50" />
        Chưa có tệp nào để chỉnh sửa. Hãy tải file lên ở trang Upload.
      </GlassPanel>
    )
  }

  const lang = monacoLangFor(activeFile.format)
  const translated = activeFile.translatedContent ?? ''

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-[calc(100vh-9.5rem)] md:h-[calc(100vh-7rem)]">
      <GlassPanel className="md:w-64 shrink-0 p-3 overflow-x-auto md:overflow-y-auto max-h-32 md:max-h-none">
        <div className="text-xs uppercase text-[var(--color-muted)] px-2 mb-2 tracking-wide hidden md:block">Danh sách tệp</div>
        <div className="flex md:flex-col gap-1 md:space-y-1">
          {editableFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFileId(f.id)}
              className={clsx(
                'text-left px-2.5 py-2 rounded-lg text-sm truncate transition-colors flex items-center gap-2 shrink-0 max-w-[10rem] md:max-w-none md:w-full',
                f.id === activeFile.id ? 'bg-[var(--color-jade)]/12 text-[var(--color-jade)]' : 'hover:bg-white/[0.05] text-[var(--color-text)]'
              )}
              title={f.path}
            >
              <span className="truncate flex-1">{f.path}</span>
            </button>
          ))}
        </div>
      </GlassPanel>

      <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
        <GlassPanel className="p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={15} className="text-[var(--color-muted)] shrink-0" />
            <span className="text-sm font-medium truncate max-w-[10rem] sm:max-w-xs">{activeFile.path}</span>
            <StatusBadge status={activeFile.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant={mode === 'split' ? 'primary' : 'secondary'} onClick={() => setMode('split')}>
              <Columns2 size={14} /> <span className="hidden sm:inline">Song song</span>
            </Button>
            <Button size="sm" variant={mode === 'diff' ? 'primary' : 'secondary'} onClick={() => setMode('diff')}>
              <GitCompare size={14} /> <span className="hidden sm:inline">Diff</span>
            </Button>
            <Button size="sm" onClick={() => translateOne(activeFile.id)} disabled={!apiKey || activeFile.status === 'translating'}>
              <Play size={14} /> <span className="hidden sm:inline">Dịch lại</span>
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="flex-1 overflow-hidden p-0 min-h-0">
          {mode === 'split' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 h-full divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
              <div className="flex flex-col min-w-0 min-h-0 h-1/2 sm:h-full">
                <div className="px-3 py-2 text-xs text-[var(--color-muted)] border-b border-white/[0.06]">Nguyên bản</div>
                <Editor
                  language={lang}
                  value={activeFile.originalContent}
                  theme="vs-dark"
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                />
              </div>
              <div className="flex flex-col min-w-0 min-h-0 h-1/2 sm:h-full">
                <div className="px-3 py-2 text-xs text-[var(--color-muted)] border-b border-white/[0.06]">Bản dịch (có thể sửa)</div>
                <Editor
                  language={lang}
                  value={translated}
                  theme="vs-dark"
                  options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                  onChange={(val) => updateFileContent(activeFile.id, val ?? '')}
                />
              </div>
            </div>
          ) : (
            <DiffEditor
              language={lang}
              original={activeFile.originalContent}
              modified={translated}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', readOnly: false }}
              onMount={(editor) => {
                editor.getModifiedEditor().onDidChangeModelContent(() => {
                  updateFileContent(activeFile.id, editor.getModifiedEditor().getValue())
                })
              }}
            />
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
