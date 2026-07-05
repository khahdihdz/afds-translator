import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-jade)]',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
        variant === 'primary' &&
          'bg-[var(--color-jade)] text-[#04140f] hover:bg-[var(--color-jade-dim)] shadow-[0_0_0_1px_rgba(34,211,170,0.4),0_8px_24px_-8px_rgba(34,211,170,0.5)]',
        variant === 'secondary' &&
          'glass text-[var(--color-text)] hover:bg-white/[0.07]',
        variant === 'ghost' && 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.05]',
        variant === 'danger' && 'bg-[var(--color-danger)]/15 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/25 border border-[var(--color-danger)]/30',
        className
      )}
      {...props}
    />
  )
}
