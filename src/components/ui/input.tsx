import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-background/50 px-3 py-2 text-sm font-medium transition-all outline-none file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
