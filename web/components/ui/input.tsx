import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-[#262626] bg-[#111111] px-3 py-1 text-sm text-[#fafafa] shadow-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#666666] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0070f3] focus-visible:border-[#0070f3] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
