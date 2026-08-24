import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-[#0070f3]",
  {
    variants: {
      variant: {
        default:
          "border border-[#262626] bg-[#181818] text-[#fafafa]",
        master:
          "border border-[#1db954]/40 bg-[#1db954]/10 text-[#1db954] font-semibold",
        secondary:
          "border border-transparent bg-[#262626] text-[#a1a1a1]",
        destructive:
          "border border-[#e5484d]/40 bg-[#e5484d]/10 text-[#e5484d]",
        outline: "text-[#fafafa] border border-[#262626]",
        accent:
          "border border-[#0070f3]/40 bg-[#0070f3]/10 text-[#0070f3]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
