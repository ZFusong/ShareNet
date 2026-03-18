import type { ComponentProps } from 'react'
import { Toaster as Sonner } from 'sonner'
type ToasterProps = ComponentProps<typeof Sonner>
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="bottom-right"
      richColors
      closeButton={false}
      expand
      visibleToasts={3}
      duration={3000}
      offset={{ right: 10, bottom: 40 }}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast border border-border bg-background text-foreground shadow-lg',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          closeButton: 'border border-border bg-background text-foreground',
          success: 'border-emerald-300 bg-success text-foreground',
          error: 'border-red-300 bg-danger text-foreground'
        }
      }}
      {...props}
    />
  )
}
export { Toaster }
