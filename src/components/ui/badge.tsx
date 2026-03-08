import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        muted: "border-border/60 bg-background/50 text-muted-foreground",
        success:
          "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
        info: "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400",
        warning:
          "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
        danger:
          "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
