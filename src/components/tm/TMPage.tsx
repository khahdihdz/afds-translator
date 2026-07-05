import { useEffect, useState } from 'react'
import { Trash2, Database, Search } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { listTM, clearTM, deleteTMEntry } from '../../lib/translationMemory'

export function TMPage() {
  const [entries, setEntries] = useState(listTM())
  const [query, setQuery] = useState('')

  useEffect(() => {
    setEntries(listTM())
  }, [])

  const filtered = entries.filter(
    (e) => e.source.toLowerCase().includes(query.toLowerCase()) || e.target.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <Database size={16} className="text-[var(--color-jade)] shrink-0" />
          {entries.length} câu đã lưu trong Translation Memory
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[var(--color-jade)]/40 w-full sm:w-56"
            />
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              clearTM()
              setEntries([])
            }}
          >
            <Trash2 size={13} /> <span className="hidden sm:inline">Xoá tất cả</span>
          </Button>
        </div>
      </GlassPanel>

      <GlassPanel className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[var(--color-muted)] text-sm">
            {entries.length === 0 ? 'Chưa có bản ghi nào. Dịch một tệp để bắt đầu tích luỹ Translation Memory.' : 'Không tìm thấy kết quả.'}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05] max-h-[65vh] overflow-y-auto">
            {filtered.map((e) => (
              <div key={e.source} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 px-4 py-3 text-sm hover:bg-white/[0.02]">
                <div className="text-[var(--color-muted)] truncate" title={e.source}>{e.source}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate" title={e.target}>{e.target}</span>
                  <button
                    onClick={() => {
                      deleteTMEntry(e.source)
                      setEntries(listTM())
                    }}
                    className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  )
}
