import clsx from 'clsx'
import type { FileStatus } from '../../types'

export function ProgressBar({ value, animated = false }: { value: number; animated?: boolean }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden relative">
      <div
        className="h-full rounded-full bg-[var(--color-jade)] transition-[width] duration-300 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
      {animated && <div className="absolute inset-0 shimmer" />}
    </div>
  )
}

const STATUS_LABEL: Record<FileStatus, string> = {
  pending: 'Chờ dịch',
  translating: 'Đang dịch',
  done: 'Hoàn tất',
  error: 'Lỗi',
  canceled: 'Đã huỷ',
}

const STATUS_STYLE: Record<FileStatus, string> = {
  pending: 'text-[var(--color-muted)] bg-white/[0.05]',
  translating: 'text-[var(--color-gold)] bg-[var(--color-gold)]/10',
  done: 'text-[var(--color-jade)] bg-[var(--color-jade)]/10',
  error: 'text-[var(--color-danger)] bg-[var(--color-danger)]/10',
  canceled: 'text-[var(--color-muted)] bg-white/[0.05]',
}

export function StatusBadge({ status }: { status: FileStatus }) {
  return (
    <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  )
}
