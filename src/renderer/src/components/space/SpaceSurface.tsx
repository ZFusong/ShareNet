import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface SpaceSurfaceProps extends PropsWithChildren {
  className?: string
  tone?: 'default' | 'hero' | 'muted' | 'accent'
}

const toneClasses: Record<NonNullable<SpaceSurfaceProps['tone']>, string> = {
  default: 'border-[#d8e1ec] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
  hero: 'border-[#d9e4ff] bg-[radial-gradient(circle_at_top_left,_rgba(96,132,255,0.16),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f6f9ff_100%)] shadow-[0_22px_50px_rgba(76,104,179,0.12)]',
  muted: 'border-[#dce4ef] bg-[#f7fafc] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]',
  accent: 'border-[#cfdcff] bg-[linear-gradient(180deg,#f7f9ff_0%,#eef4ff_100%)] shadow-[0_18px_44px_rgba(95,122,203,0.12)]'
}

export function SpaceSurface({ children, className, tone = 'default' }: SpaceSurfaceProps) {
  return (
    <section
      className={cn(
        'rounded-[24px] border text-[#0f172a]',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </section>
  )
}
