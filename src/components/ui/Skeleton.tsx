import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rounded" | "line" | "circle";
}

export function Skeleton({
  className,
  variant = "rounded",
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rounded: "rounded-2xl",
    line: "rounded-lg h-4 w-full",
    circle: "rounded-full aspect-square",
  };

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "animate-pulse bg-slate-200/80 dark:bg-slate-800/80",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="line" className="h-4 w-1/3" />
          <Skeleton variant="line" className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton variant="line" className="h-16 w-full rounded-xl" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton variant="line" className="h-4 w-20" />
        <Skeleton variant="line" className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}
