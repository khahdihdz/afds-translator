import { useEffect, useRef, useState } from 'react'
import { Terminal, Trash2, ChevronDown, ChevronUp, ArrowDownToLine } from 'lucide-react'
import clsx from 'clsx'
import { GlassPanel } from './GlassPanel'
import { Button } from './Button'
import { useLiveLog } from '../../hooks/useLiveLog'
import { liveLog, type LogLevel } from '../../lib/liveLog'

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: 'text-[var(--color-muted)]',
  success: 'text-[var(--color-jade)]',
  warning: 'text-[var(--color-gold)]',
  error: 'text-[var(--color-danger)]',
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  info: '·',
  success: '✓',
  warning: '!',
  error: '✕',
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('vi-VN', { hour12: false })
}

export function LiveLogPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const entries = useLiveLog()
  const [open, setOpen] = useState(defaultOpen)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !autoScroll) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries, open, autoScroll])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(nearBottom)
  }

  return (
    <GlassPanel className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-white/[0.02] transition-colors"
      >
        <Terminal size={15} className="text-[var(--color-jade)]" />
        <span className="flex-1 text-left">Nhật ký trực tiếp</span>
        <span className="text-xs text-[var(--color-muted)] font-normal">{entries.length} dòng</span>
        {open ? <ChevronUp size={15} className="text-[var(--color-muted)]" /> : <ChevronDown size={15} className="text-[var(--color-muted)]" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
            <span className="text-xs text-[var(--color-muted)]">
              {autoScroll ? 'Tự động cuộn' : 'Đã tạm dừng cuộn — cuộn xuống dưới để tiếp tục'}
            </span>
            <div className="flex items-center gap-2">
              {!autoScroll && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAutoScroll(true)
                    const el = scrollRef.current
                    if (el) el.scrollTop = el.scrollHeight
                  }}
                >
                  <ArrowDownToLine size={13} /> Xuống cuối
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => liveLog.clear()}>
                <Trash2 size={13} /> Xoá nhật ký
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="max-h-64 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed bg-black/20"
          >
            {entries.length === 0 ? (
              <div className="text-[var(--color-muted)] text-center py-6">Chưa có hoạt động nào.</div>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="flex gap-2 py-0.5">
                  <span className="text-[var(--color-muted)] shrink-0">{formatTime(e.time)}</span>
                  <span className={clsx('shrink-0', LEVEL_STYLE[e.level])}>{LEVEL_PREFIX[e.level]}</span>
                  <span className={clsx('break-words', LEVEL_STYLE[e.level])}>{e.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </GlassPanel>
  )
}
