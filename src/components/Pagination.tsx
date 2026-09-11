"use client";

import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  showInfo?: boolean;
  showPageSizeSelector?: boolean;
  compact?: boolean;
  itemLabel?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = "",
  showInfo = true,
  showPageSizeSelector = true,
  compact = false,
  itemLabel = "data",
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 10))) {
    // If only 1 page and no need for pagination controls, show simple info if requested
    if (showInfo && totalItems !== undefined && totalItems > 0) {
      return (
        <div className={`flex items-center justify-between py-2 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
          <span>
            Menampilkan seluruh <strong>{totalItems}</strong> {itemLabel}
          </span>
        </div>
      );
    }
    return null;
  }

  // Calculate item range for information
  const currentSize = pageSize || 10;
  const startItem = (currentPage - 1) * currentSize + 1;
  const endItem = totalItems !== undefined ? Math.min(currentPage * currentSize, totalItems) : currentPage * currentSize;

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  // Compact layout (e.g. for card footers or mobile sidebars)
  if (compact) {
    return (
      <div className={`flex items-center justify-between gap-2 py-2 ${className}`}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Halaman Sebelumnya"
        >
          <i className="fa-solid fa-chevron-left text-[10px]"></i>
        </button>

        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Hal <strong className="text-syarat">{currentPage}</strong> / {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Halaman Selanjutnya"
        >
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs ${className}`}
    >
      {/* Left side: Info & Page size selector */}
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        {showInfo && totalItems !== undefined && (
          <span>
            Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari <strong>{totalItems}</strong> {itemLabel}
          </span>
        )}

        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">Baris:</span>
            <select
              value={currentSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-syarat"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Halaman Pertama"
        >
          <i className="fa-solid fa-angles-left text-[10px]"></i>
        </button>

        {/* Previous */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Sebelumnya"
        >
          <i className="fa-solid fa-chevron-left text-[10px]"></i>
        </button>

        {/* Numbers & Ellipses */}
        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`dots-${idx}`} className="w-7 h-8 flex items-center justify-center text-slate-400 font-bold">
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-xl font-bold transition-all text-xs flex items-center justify-center ${
                isActive
                  ? "bg-syarat text-white shadow-md shadow-syarat/30 ring-2 ring-syarat/20"
                  : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Next */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Selanjutnya"
        >
          <i className="fa-solid fa-chevron-right text-[10px]"></i>
        </button>

        {/* Last Page */}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Halaman Terakhir"
        >
          <i className="fa-solid fa-angles-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
}
