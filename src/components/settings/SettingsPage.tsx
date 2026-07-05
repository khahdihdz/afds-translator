import { useState } from 'react'
import { Eye, EyeOff, KeyRound, SlidersHorizontal, MessageSquareText, UserRound } from 'lucide-react'
import { GlassPanel } from '../common/GlassPanel'
import { useAppStore } from '../../store/useAppStore'
import type { NameHandling } from '../../types'

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[var(--color-muted)]">{label}</span>
        <span className="font-mono text-[var(--color-jade)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-jade)]"
      />
    </div>
  )
}

const NAME_OPTIONS: { value: NameHandling; label: string }[] = [
  { value: 'keep', label: 'Giữ nguyên tên nhân vật' },
  { value: 'vietnamize', label: 'Việt hóa tên nhân vật' },
  { value: 'hanviet', label: 'Phiên âm Hán Việt' },
]

export function SettingsPage() {
  const apiKey = useAppStore((s) => s.apiKey)
  const setApiKey = useAppStore((s) => s.setApiKey)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [showKey, setShowKey] = useState(false)

  return (
    <div className="space-y-4 max-w-3xl">
      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 font-medium mb-4">
          <KeyRound size={17} className="text-[var(--color-jade)]" />
          API Key
        </div>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Nhập API Key cho api.vilao.ai"
            className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[var(--color-jade)]/40 font-mono"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          API Key chỉ lưu tại trình duyệt của bạn (localStorage), không gửi lên server nào khác ngoài api.vilao.ai.
        </p>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 font-medium mb-4">
          <SlidersHorizontal size={17} className="text-[var(--color-jade)]" />
          Tham số AI
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-[var(--color-muted)] mb-1.5">Model</div>
            <div className="grid grid-cols-2 gap-2">
              {(['deepseek-v4-flash', 'deepseek-v4-pro'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => updateSettings({ model: m })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    settings.model === m
                      ? 'border-[var(--color-jade)]/40 bg-[var(--color-jade)]/10 text-[var(--color-jade)]'
                      : 'border-white/[0.08] text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Slider label="Temperature" value={settings.temperature} min={0} max={1.5} step={0.05} onChange={(v) => updateSettings({ temperature: v })} />
          <Slider label="Top P" value={settings.topP} min={0.1} max={1} step={0.05} onChange={(v) => updateSettings({ topP: v })} />
          <Slider label="Max Tokens" value={settings.maxTokens} min={512} max={8192} step={128} onChange={(v) => updateSettings({ maxTokens: v })} />
          <Slider label="Số luồng dịch song song (tăng để dịch nhanh hơn)" value={settings.concurrency} min={1} max={10} step={1} onChange={(v) => updateSettings({ concurrency: v })} />
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 font-medium mb-4">
          <UserRound size={17} className="text-[var(--color-jade)]" />
          Tên riêng
        </div>
        <div className="space-y-2 mb-4">
          {NAME_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="nameHandling"
                checked={settings.nameHandling === opt.value}
                onChange={() => updateSettings({ nameHandling: opt.value })}
                className="accent-[var(--color-jade)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="space-y-2 pt-3 border-t border-white/[0.06]">
          {[
            { key: 'translateSkillNames' as const, label: 'Dịch tên kỹ năng' },
            { key: 'translateItemNames' as const, label: 'Dịch tên vật phẩm' },
            { key: 'translatePlaceNames' as const, label: 'Dịch địa danh' },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings[opt.key]}
                onChange={(e) => updateSettings({ [opt.key]: e.target.checked })}
                className="accent-[var(--color-jade)]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 font-medium mb-4">
          <MessageSquareText size={17} className="text-[var(--color-jade)]" />
          Prompt tùy chỉnh
        </div>
        <div className="text-sm text-[var(--color-muted)] mb-2">
          Ghi đè toàn bộ prompt hệ thống mặc định (để trống để dùng prompt chuẩn đã tối ưu cho dịch game).
        </div>
        <textarea
          value={settings.systemPromptOverride ?? ''}
          onChange={(e) => updateSettings({ systemPromptOverride: e.target.value || null })}
          rows={6}
          placeholder="Để trống để dùng prompt mặc định..."
          className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[var(--color-jade)]/40 font-mono resize-y"
        />
      </GlassPanel>
    </div>
  )
}
