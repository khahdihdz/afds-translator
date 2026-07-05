import { useMemo } from 'react'
import { CheckCircle2, XCircle, FileText } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/useAppStore'
import { validateJson, validateXml, validateLineCount } from '../../lib/validators'
import { XML_LIKE } from '../../lib/formats/detect'

const HIGHLIGHT_RE = /(\{\{[^}]*\}\}|\[\[[^\]]*\]\]|\$\([^)]*\)|\$\{[^}]*\}|\{[a-zA-Z0-9_]*\}|\[[a-zA-Z0-9_]+\]|<\/?[a-zA-Z][^<>]*>|%[sdifgxX%]|@[a-zA-Z0-9_]+|\\[nrt])/g

function renderHighlighted(text: string) {
  const parts = text.split(HIGHLIGHT_RE)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="rounded px-1 bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-mono text-[0.85em]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function PreviewPage() {
  const files = useAppStore((s) => s.files)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const editableFiles = files.filter((f) => !f.isBinaryPassthrough)
  const activeFile = files.find((f) => f.id === activeFileId) ?? editableFiles[0]

  const checks = useMemo(() => {
    if (!activeFile || !activeFile.translatedContent) return []
    const results: { label: string; ok: boolean; issues: string[] }[] = []

    if (activeFile.format === 'json') {
      const r = validateJson(activeFile.translatedContent)
      results.push({ label: 'Cấu trúc JSON hợp lệ', ok: r.ok, issues: r.issues })
    } else if (XML_LIKE.includes(activeFile.format)) {
      const r = validateXml(activeFile.translatedContent)
      results.push({ label: 'Cấu trúc XML hợp lệ', ok: r.ok, issues: r.issues })
    }

    const lineCheck = validateLineCount(activeFile.originalContent, activeFile.translatedContent)
    results.push({ label: 'Số dòng không đổi', ok: lineCheck.ok, issues: lineCheck.issues })

    return results
  }, [activeFile])

  if (!activeFile) {
    return (
      <GlassPanel className="p-10 text-center text-[var(--color-muted)]">
        <FileText size={28} className="mx-auto mb-3 opacity-50" />
        Chưa có tệp nào để xem trước.
      </GlassPanel>
    )
  }

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{activeFile.path}</span>
        <div className="flex gap-2 flex-wrap">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 ${
                c.ok ? 'text-[var(--color-jade)] bg-[var(--color-jade)]/10' : 'text-[var(--color-danger)] bg-[var(--color-danger)]/10'
              }`}
              title={c.issues.join('\n')}
            >
              {c.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {c.label}
            </span>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        {!activeFile.translatedContent ? (
          <div className="text-center text-[var(--color-muted)] py-10">Tệp này chưa được dịch.</div>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
            {renderHighlighted(activeFile.translatedContent)}
          </pre>
        )}
      </GlassPanel>
    </div>
  )
}
