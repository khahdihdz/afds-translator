import type { ReactNode } from 'react'
import clsx from 'clsx'

export function GlassPanel({
  children,
  className,
  strong = false,
}: {
  children: ReactNode
  className?: string
  strong?: boolean
}) {
  return (
    <div className={clsx(strong ? 'glass-strong' : 'glass', 'rounded-2xl', className)}>
      {children}
    </div>
  )
}
