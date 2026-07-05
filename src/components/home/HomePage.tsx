import { ArrowRight, ShieldCheck, Braces, GitBranch, Sparkles } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { Button } from '../common/Button'
import { useAppStore } from '../../store/useAppStore'
import type { PageId } from '../layout/nav'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Giữ nguyên biến & placeholder',
    desc: '%s, {0}, {player}, <color>, \\n... luôn được bảo toàn 100%, không bị AI dịch nhầm.',
  },
  {
    icon: Braces,
    title: 'Không đổi cấu trúc file',
    desc: 'JSON vẫn là JSON, XML vẫn là XML — chỉ nội dung hiển thị được dịch.',
  },
  {
    icon: GitBranch,
    title: 'Translation Memory + Glossary',
    desc: 'Câu trùng lặp dịch giống nhau tuyệt đối. Thuật ngữ game áp dụng nhất quán.',
  },
]

export function HomePage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const files = useAppStore((s) => s.files)

  return (
    <div className="space-y-8">
      {/* Hero: signature "translation flow" element */}
      <GlassPanel strong className="relative overflow-hidden p-5 sm:p-7 md:p-10">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--color-jade)]/10 blur-3xl" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[var(--color-gold)]/10 blur-3xl" />

        <div className="relative flex items-center gap-1.5 text-[var(--color-jade)] text-xs font-medium mb-4">
          <Sparkles size={14} />
          <span>DeepSeek V4 · Flash / Pro</span>
        </div>

        <h1 className="relative text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl mb-3">
          Dịch game sang tiếng Việt,{' '}
          <span className="text-[var(--color-jade)]">tự nhiên như người bản địa</span>
        </h1>
        <p className="relative text-[var(--color-muted)] max-w-xl mb-8 text-sm sm:text-base">
          Giữ nguyên toàn bộ biến, placeholder, cấu trúc file — chỉ dịch phần văn bản người chơi nhìn thấy.
          Không làm game lỗi sau khi dịch.
        </p>

        {/* signature flow visual: original -> pipeline -> Vietnamese */}
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 max-w-2xl">
          <div className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-[12px] sm:text-[13px] text-[var(--color-muted)] break-words">
            Gold: %d obtained
          </div>
          <div className="flex sm:flex-col items-center justify-center gap-1 px-1 rotate-90 sm:rotate-0">
            <div className="h-px w-8 bg-gradient-to-r from-transparent via-[var(--color-jade)] to-transparent flow-pulse" />
            <ArrowRight size={16} className="text-[var(--color-jade)] shrink-0" />
          </div>
          <div className="flex-1 rounded-xl border border-[var(--color-jade)]/30 bg-[var(--color-jade)]/5 px-4 py-3 font-mono text-[12px] sm:text-[13px] text-[var(--color-text)] break-words">
            Nhận được: %d Vàng
          </div>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-3">
          <Button onClick={() => onNavigate('upload')} className="w-full sm:w-auto">
            Bắt đầu dịch <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" onClick={() => onNavigate('settings')} className="w-full sm:w-auto">
            Cấu hình API Key
          </Button>
        </div>
      </GlassPanel>

      <div className="grid md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <GlassPanel key={f.title} className="p-5">
            <f.icon size={20} className="text-[var(--color-jade)] mb-3" />
            <div className="font-medium mb-1.5">{f.title}</div>
            <div className="text-sm text-[var(--color-muted)] leading-relaxed">{f.desc}</div>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium">Dự án hiện tại</div>
          <span className="text-sm text-[var(--color-muted)]">{files.length} tệp</span>
        </div>
        {files.length === 0 ? (
          <div className="text-sm text-[var(--color-muted)] py-6 text-center">
            Chưa có tệp nào. Tải lên file game để bắt đầu.
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted)]">
            {files.filter((f) => f.status === 'done').length} / {files.length} tệp đã dịch xong.
          </div>
        )}
      </GlassPanel>
    </div>
  )
}
