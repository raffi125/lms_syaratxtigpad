"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export default function Toast() {
  const { toast, hideToast } = useApp();

  if (!toast.show) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-syarat" />,
  };

  const bgColors = {
    success: "border-green-500/30 bg-green-500/10 text-slate-800 dark:text-green-200",
    error: "border-red-500/30 bg-red-500/10 text-slate-800 dark:text-red-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-slate-800 dark:text-amber-200",
    info: "border-syarat/30 bg-syarat/10 text-slate-800 dark:text-blue-200",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-sm">
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-xl border ${
          bgColors[toast.type]
        } bg-white dark:bg-slate-900`}
      >
        {icons[toast.type]}
        <div className="text-xs font-semibold flex-1 leading-snug">{toast.message}</div>
        <button
          onClick={hideToast}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
