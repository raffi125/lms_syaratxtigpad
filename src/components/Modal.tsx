"use client";

import React, { useEffect, useCallback } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  headerActions?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  footer,
  size = "lg",
  className = "",
  closeOnBackdrop = true,
  closeOnEsc = true,
  headerActions,
}: ModalProps) {
  // ESC key listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    "2xl": "max-w-6xl",
    full: "max-w-[96vw]",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.lg;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Container */}
      <div
        className={`glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative z-10 animate-slide-up ${currentSizeClass} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        {(title || subtitle || icon || badge || headerActions) && (
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
            <div className="min-w-0 flex items-start gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-2xl bg-syarat/10 text-syarat border border-syarat/20 flex items-center justify-center shrink-0 mt-0.5">
                  <i className={`${icon} text-base`}></i>
                </div>
              )}
              <div className="min-w-0">
                {badge && <div className="mb-1">{badge}</div>}
                {title && (
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Tutup (Esc)"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Alias export PopUp
export { Modal as PopUp };
