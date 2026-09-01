import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold leading-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-border text-foreground",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        live: "bg-live text-white",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
