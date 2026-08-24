import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0070f3] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#fafafa] text-[#0a0a0a] hover:bg-[#eaeaea] active:bg-[#dedede]",
        primary:
          "bg-[#1db954] text-black font-semibold hover:bg-[#1ed760] active:bg-[#1aa34a]",
        secondary:
          "bg-[#181818] text-[#fafafa] border border-[#262626] hover:bg-[#222222] hover:border-[#383838] active:bg-[#282828]",
        ghost:
          "text-[#a1a1a1] hover:text-[#fafafa] hover:bg-[#181818] active:bg-[#222222]",
        danger:
          "bg-[#e5484d] text-white hover:bg-[#f2555a] active:bg-[#d63d42]",
        outline:
          "border border-[#262626] text-[#fafafa] hover:bg-[#181818] hover:border-[#383838]",
        link: "text-[#1db954] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-10 rounded-md px-6 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
