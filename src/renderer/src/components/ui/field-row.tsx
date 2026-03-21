import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FieldRowProps = {
  label: string
  labelClassName?: string
  className?: string
  children: ReactNode
}

export const FieldRow = ({ label, className, labelClassName, children }: FieldRowProps) => (
  <div className={cn('flex flex-row items-center gap-4', className)}>
    <label className={cn('w-12 flex-shrink-0 text-left text-sm font-medium text-muted-foreground', labelClassName)}>
      {label}
    </label>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
)
