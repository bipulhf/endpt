import * as React from "react";
import { cn } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "control-field flex h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/90",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
