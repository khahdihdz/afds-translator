import { useState } from 'react'
import { Menu, Languages } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { NAV_ITEMS } from './components/layout/nav'
import type { PageId } from './components/layout/nav'
import { HomePage } from './components/home/HomePage'
import { UploadPage } from './components/upload/UploadPage'
import { EditorPage } from './components/editor/EditorPage'
import { PreviewPage } from './components/preview/PreviewPage'
import { TMPage } from './components/tm/TMPage'
import { GlossaryPage } from './components/glossary/GlossaryPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { LiveProgressBar } from './components/common/LiveProgressBar'

function App() {
  const [page, setPage] = useState<PageId>('home')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const currentLabel = NAV_ITEMS.find((n) => n.id === page)?.label ?? ''

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row gap-3 md:gap-4 p-2 sm:p-3 md:p-4 overflow-hidden">
      <Sidebar page={page} onNavigate={setPage} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center gap-3 glass-strong rounded-2xl px-3 py-2.5 shrink-0">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="h-9 w-9 grid place-items-center rounded-xl hover:bg-white/[0.06] text-[var(--color-text)] shrink-0"
          aria-label="Mở menu"
        >
          <Menu size={19} />
        </button>
        <div className="h-8 w-8 rounded-lg bg-[var(--color-jade)]/15 border border-[var(--color-jade)]/30 grid place-items-center shrink-0">
          <Languages size={15} className="text-[var(--color-jade)]" />
        </div>
        <span className="font-medium text-sm truncate">{currentLabel}</span>
      </div>

      <main className="flex-1 overflow-y-auto min-w-0 pb-2 flex flex-col gap-3 md:gap-4">
        <LiveProgressBar />
        <div className="flex-1 min-w-0">
          {page === 'home' && <HomePage onNavigate={setPage} />}
          {page === 'upload' && <UploadPage onNavigate={setPage} />}
          {page === 'editor' && <EditorPage />}
          {page === 'preview' && <PreviewPage />}
          {page === 'tm' && <TMPage />}
          {page === 'glossary' && <GlossaryPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}

export default App
