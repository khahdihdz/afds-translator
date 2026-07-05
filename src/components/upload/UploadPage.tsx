import { useRef, useState } from 'react'
import { UploadCloud, FileText, Trash2, Play, X, Download, FolderArchive } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { ProgressBar, StatusBadge } from '../common/Progress'
import { useAppStore } from '../../store/useAppStore'
import type { PageId } from '../layout/nav'

const ACCEPT =
  '.txt,.json,.xml,.csv,.yaml,.yml,.ini,.cfg,.properties,.strings,.lang,.lua,.js,.ts,.cs,.java,.kt,.renpy,.rpy,.po,.mo,.resx,.plist,.xlsx,.zip,.rar,.7z'

export function UploadPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const files = useAppStore((s) => s.files)
  const addFiles = useAppStore((s) => s.addFiles)
  const removeFile = useAppStore((s) => s.removeFile)
  const clearFiles = useAppStore((s) => s.clearFiles)
  const translateAll = useAppStore((s) => s.translateAll)
  const translateOne = useAppStore((s) => s.translateOne)
  const cancelTranslation = useAppStore((s) => s.cancelTranslation)
  const isTranslating = useAppStore((s) => s.isTranslating)
  const downloadAllAsZip = useAppStore((s) => s.downloadAllAsZip)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const apiKey = useAppStore((s) => s.apiKey)

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    await addFiles(Array.from(list))
  }

  const editableCount = files.filter((f) => !f.isBinaryPassthrough).length
  const pendingCount = files.filter((f) => f.status === 'pending' || f.status === 'error').length

  return (
    <div className="space-y-6">
      <GlassPanel
        strong
        className={`p-6 sm:p-10 border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-[var(--color-jade)] bg-[var(--color-jade)]/5' : 'border-white/10'
        }`}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center text-center gap-3"
        >
          <div className="h-14 w-14 rounded-2xl bg-[var(--color-jade)]/10 border border-[var(--color-jade)]/25 grid place-items-center">
            <UploadCloud size={26} className="text-[var(--color-jade)]" />
          </div>
          <div className="font-medium">Kéo & thả file game vào đây, hoặc bấm để chọn</div>
          <div className="text-sm text-[var(--color-muted)] max-w-md">
            Hỗ trợ TXT, JSON, XML, CSV, YAML, INI, Lua, RenPy (.rpy), PO, RESX, và ZIP chứa nhiều file.
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </GlassPanel>

      {!apiKey && (
        <GlassPanel className="p-4 border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5">
          <div className="text-sm">
            Bạn chưa nhập <b>API Key</b>. Vào{' '}
            <button className="text-[var(--color-jade)] underline underline-offset-2" onClick={() => onNavigate('settings')}>
              Cài đặt
            </button>{' '}
            để nhập trước khi dịch.
          </div>
        </GlassPanel>
      )}

      {files.length > 0 && (
        <GlassPanel className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="font-medium text-sm sm:text-base">
              {files.length} tệp <span className="text-[var(--color-muted)] font-normal">({editableCount} có thể dịch)</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isTranslating ? (
                <Button variant="danger" size="sm" onClick={cancelTranslation}>
                  <X size={14} /> Huỷ dịch
                </Button>
              ) : (
                <Button size="sm" onClick={() => translateAll()} disabled={pendingCount === 0 || !apiKey}>
                  <Play size={14} /> Dịch tất cả ({pendingCount})
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => downloadAllAsZip()}>
                <Download size={14} /> Tải ZIP
              </Button>
              <Button size="sm" variant="ghost" onClick={clearFiles}>
                <Trash2 size={14} /> Xoá tất cả
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 rounded-xl px-3 py-2.5 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                {f.fromZip ? (
                  <FolderArchive size={16} className="text-[var(--color-muted)] shrink-0" />
                ) : (
                  <FileText size={16} className="text-[var(--color-muted)] shrink-0" />
                )}
                <div className="flex-1 min-w-[8rem] order-1 sm:order-none">
                  <button
                    className="text-sm truncate block text-left hover:text-[var(--color-jade)] transition-colors w-full"
                    onClick={() => {
                      setActiveFileId(f.id)
                      onNavigate('editor')
                    }}
                    title={f.path}
                  >
                    {f.path}
                  </button>
                  {f.status === 'translating' && <ProgressBar value={f.progress} animated />}
                  {f.error && <div className="text-xs text-[var(--color-gold)] mt-0.5 truncate">{f.error}</div>}
                </div>
                <span className="text-xs text-[var(--color-muted)] uppercase shrink-0 hidden sm:inline">{f.format}</span>
                <StatusBadge status={f.status} />
                <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                  {!f.isBinaryPassthrough && f.status !== 'translating' && (
                    <Button size="sm" variant="ghost" onClick={() => translateOne(f.id)} disabled={!apiKey}>
                      <Play size={13} />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeFile(f.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}
