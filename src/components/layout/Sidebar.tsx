import { Home, UploadCloud, FileEdit, Eye, Database, BookMarked, Settings, Languages, X } from 'lucide-react'
import clsx from 'clsx'
import type { PageId } from './nav'
import { NAV_ITEMS } from './nav'
import { useAppStore } from '../../store/useAppStore'

const ICONS: Record<string, typeof Home> = {
  home: Home,
  upload: UploadCloud,
  edit: FileEdit,
  eye: Eye,
  memory: Database,
  book: BookMarked,
  settings: Settings,
}

interface SidebarProps {
  page: PageId
  onNavigate: (p: PageId) => void
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ page, onNavigate, mobileOpen, onClose }: SidebarProps) {
  const files = useAppStore((s) => s.files)
  const doneCount = files.filter((f) => f.status === 'done').length

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-2 pb-6 pt-1">
        <div className="h-9 w-9 rounded-xl bg-[var(--color-jade)]/15 border border-[var(--color-jade)]/30 grid place-items-center shrink-0">
          <Languages size={18} className="text-[var(--color-jade)]" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-semibold text-[15px] tracking-tight truncate">AFDS Translator</div>
          <div className="text-[11px] text-[var(--color-muted)] truncate">AI Game Localization</div>
        </div>
        <button onClick={onClose} className="ml-auto md:hidden text-[var(--color-muted)] hover:text-[var(--color-text)] p-1">
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon]
          const active = page === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                onClose()
              }}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors text-left',
                active
                  ? 'bg-[var(--color-jade)]/12 text-[var(--color-jade)] border border-[var(--color-jade)]/25'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.id === 'upload' && files.length > 0 && (
                <span className="text-[11px] rounded-full bg-white/10 px-1.5 py-0.5">{files.length}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="rounded-xl px-3 py-3 text-[11px] text-[var(--color-muted)] border border-white/[0.06] shrink-0">
        <div className="flex justify-between mb-1">
          <span>Đã dịch</span>
          <span className="text-[var(--color-jade)]">{doneCount}/{files.length || 0}</span>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-[var(--color-jade)] rounded-full transition-[width]"
            style={{ width: files.length ? `${(doneCount / files.length) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 h-full flex-col glass-strong rounded-2xl p-4">
        {content}
      </aside>

      {/* Mobile: overlay + slide-in drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative z-50 w-72 max-w-[85vw] h-full flex flex-col glass-strong rounded-r-2xl p-4 animate-[slidein_0.2s_ease-out]">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
