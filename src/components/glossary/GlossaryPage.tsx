import { useState } from 'react'
import { Plus, Trash2, BookMarked } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import type { GlossaryEntry } from '../../types'

const CATEGORY_LABEL: Record<GlossaryEntry['category'], string> = {
  general: 'Chung',
  character: 'Nhân vật',
  skill: 'Kỹ năng',
  item: 'Vật phẩm',
  place: 'Địa danh',
}

export function GlossaryPage() {
  const glossary = useAppStore((s) => s.glossary)
  const addGlossaryEntry = useAppStore((s) => s.addGlossaryEntry)
  const removeGlossaryEntry = useAppStore((s) => s.removeGlossaryEntry)
  const updateGlossaryEntry = useAppStore((s) => s.updateGlossaryEntry)

  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [category, setCategory] = useState<GlossaryEntry['category']>('general')

  function handleAdd() {
    if (!source.trim() || !target.trim()) return
    addGlossaryEntry({ source: source.trim(), target: target.trim(), category })
    setSource('')
    setTarget('')
  }

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted)] mb-3">
          <BookMarked size={16} className="text-[var(--color-jade)]" />
          Thuật ngữ dùng thống nhất khi dịch — sẽ được gửi kèm mỗi yêu cầu tới AI.
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Từ gốc (vd: Mana)"
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[var(--color-jade)]/40"
          />
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Bản dịch (vd: Ma lực)"
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[var(--color-jade)]/40"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as GlossaryEntry['category'])}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none"
            >
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0f1520]">
                  {v}
                </option>
              ))}
            </select>
            <Button onClick={handleAdd} className="shrink-0">
              <Plus size={15} /> Thêm
            </Button>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-0 overflow-hidden">
        {glossary.length === 0 ? (
          <div className="p-10 text-center text-[var(--color-muted)] text-sm">Chưa có thuật ngữ nào.</div>
        ) : (
          <div className="divide-y divide-white/[0.05] max-h-[60vh] overflow-y-auto">
            {glossary.map((g) => (
              <div key={g.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_110px_32px] gap-2 sm:gap-3 sm:items-center px-4 py-2.5 text-sm hover:bg-white/[0.02]">
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <input
                    value={g.source}
                    onChange={(e) => updateGlossaryEntry(g.id, { source: e.target.value })}
                    className="bg-transparent outline-none border-b border-transparent focus:border-[var(--color-jade)]/40 truncate min-w-0"
                  />
                  <input
                    value={g.target}
                    onChange={(e) => updateGlossaryEntry(g.id, { target: e.target.value })}
                    className="bg-transparent outline-none border-b border-transparent focus:border-[var(--color-jade)]/40 truncate min-w-0"
                  />
                </div>
                <div className="flex items-center justify-between sm:contents">
                  <span className="text-xs text-[var(--color-muted)]">{CATEGORY_LABEL[g.category]}</span>
                  <button onClick={() => removeGlossaryEntry(g.id)} className="text-[var(--color-muted)] hover:text-[var(--color-danger)] sm:justify-self-end">
                    <Trash2 size={14} />
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
