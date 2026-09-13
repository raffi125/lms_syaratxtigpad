import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-syarat focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none";

    const variantStyles = {
      primary:
        "bg-syarat hover:bg-syarat-light text-white shadow-sm shadow-syarat/20",
      accent:
        "bg-tigpad hover:bg-tigpad-light text-white shadow-sm shadow-tigpad/20",
      secondary:
        "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100",
      outline:
        "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 bg-transparent",
      ghost:
        "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 bg-transparent",
      danger:
        "bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-xl gap-1.5",
      md: "h-10 px-4 py-2 text-xs sm:text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-sm sm:text-base rounded-2xl gap-2.5",
      icon: "h-9 w-9 p-0 rounded-xl",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <i className={cn(leftIcon, size === "sm" ? "text-xs" : "text-sm")}></i>}
            {children}
            {rightIcon && <i className={cn(rightIcon, size === "sm" ? "text-xs" : "text-sm")}></i>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
