import { useEffect, useState } from 'react'
import { Loader2, Zap, X } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { useProgressTracker } from '../../hooks/useProgressTracker'
import { useAppStore } from '../../store/useAppStore'

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function LiveProgressBar() {
  const isTranslating = useAppStore((s) => s.isTranslating)
  const cancelTranslation = useAppStore((s) => s.cancelTranslation)
  const files = useAppStore((s) => s.files)
  const { totalUnits, completedUnits, activeRequests, startedAt } = useProgressTracker()

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!isTranslating) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [isTranslating])

  if (!isTranslating) return null

  const pct = totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0
  const elapsedMs = startedAt ? now - startedAt : 0
  const rate = elapsedMs > 0 ? completedUnits / (elapsedMs / 1000) : 0
  const remaining = totalUnits - completedUnits
  const etaSec = rate > 0 ? remaining / rate : null

  const doneFiles = files.filter((f) => f.status === 'done').length
  const translatingFiles = files.filter((f) => f.status === 'translating').length
  const totalFiles = files.filter((f) => !f.isBinaryPassthrough).length

  return (
    <GlassPanel strong className="shrink-0 p-3 sm:p-4 border border-[var(--color-jade)]/25">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-jade)] shrink-0">
          <Loader2 size={16} className="animate-spin" />
          Đang dịch...
        </div>

        <div className="flex-1 min-w-[10rem]">
          <div className="flex justify-between text-xs text-[var(--color-muted)] mb-1">
            <span>
              {completedUnits}/{totalUnits || '…'} đoạn · {doneFiles}/{totalFiles} tệp xong
              {translatingFiles > 0 ? ` · ${translatingFiles} tệp đang xử lý` : ''}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-jade)] transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--color-muted)] shrink-0">
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-[var(--color-gold)]" />
            {activeRequests} luồng
          </span>
          <span>{formatElapsed(elapsedMs)} đã trôi qua</span>
          {etaSec !== null && etaSec > 0 && <span>còn ~{formatElapsed(etaSec * 1000)}</span>}
        </div>

        <Button size="sm" variant="danger" onClick={cancelTranslation} className="shrink-0">
          <X size={14} /> Huỷ
        </Button>
      </div>
    </GlassPanel>
  )
}
