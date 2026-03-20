import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const CollapseRoot = CollapsiblePrimitive.Root

const CollapseTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Trigger
    ref={ref}
    className={cn(
      "group flex w-full items-center justify-between gap-3 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:text-foreground data-[state=closed]:text-foreground",
      className
    )}
    {...props}
  >
    <div className="min-w-0 flex-1">{children}</div>
    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
  </CollapsiblePrimitive.Trigger>
))
CollapseTrigger.displayName = CollapsiblePrimitive.Trigger.displayName

const CollapseContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className="overflow-hidden data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down"
    {...props}
  >
    <div className={cn(
      "pt-0 data-[state=closed]:animate-collapse-content-up data-[state=open]:animate-collapse-content-down",
      className
    )} data-state={props["data-state"]}>
      {children}
    </div>
  </CollapsiblePrimitive.Content>
))
CollapseContent.displayName = CollapsiblePrimitive.Content.displayName

const CollapseNamespace = {
  Root: CollapseRoot,
  Trigger: CollapseTrigger,
  Content: CollapseContent
} as const

export { CollapseNamespace as Collapse, CollapseTrigger, CollapseContent }
