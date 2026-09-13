import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "brand" | "accent" | "success" | "warning" | "danger" | "neutral" | "outline";
  size?: "sm" | "md";
  icon?: string;
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  icon,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    brand:
      "bg-syarat/10 text-syarat dark:text-syarat-light border-syarat/20",
    accent:
      "bg-tigpad/10 text-tigpad dark:text-tigpad-light border-tigpad/20",
    success:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    warning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    danger:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
    neutral:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    outline:
      "bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-semibold gap-1",
    md: "px-2.5 py-1 text-xs font-bold gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <i className={cn(icon, size === "sm" ? "text-[9px]" : "text-[11px]")}></i>}
      <span>{children}</span>
    </span>
  );
}
