'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Reusable pagination component with RTL support
 * Shows first, last, current page and adjacent pages with ellipsis
 */
export function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(page => {
        // Show first, last, current, and pages around current
        if (page === 1 || page === totalPages) return true;
        if (Math.abs(page - currentPage) <= 1) return true;
        return false;
      });
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Previous button (RTL: shows right chevron) */}
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label="الصفحة السابقة"
      >
        <ChevronRightIcon size={20} />
      </button>
      
      {/* Page numbers */}
      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => {
          // Add ellipsis if there's a gap
          const prevPage = visiblePages[index - 1];
          const showEllipsis = prevPage && page - prevPage > 1;
          
          return (
            <span key={page} className="flex items-center">
              {showEllipsis && (
                <span className="px-2 text-stone-400">...</span>
              )}
              <button
                onClick={() => onPageChange(page)}
                className={`min-w-[40px] h-10 rounded-lg font-medium transition ${
                  currentPage === page
                    ? 'bg-[#1a3a2f] text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {page}
              </button>
            </span>
          );
        })}
      </div>
      
      {/* Next button (RTL: shows left chevron) */}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        aria-label="الصفحة التالية"
      >
        <ChevronLeftIcon size={20} />
      </button>
    </div>
  );
}

/**
 * Helper component to show pagination info (e.g., "Showing 1-10 of 50")
 */
interface PaginationInfoProps {
  currentPage: number;
  limit: number;
  total: number;
  itemName?: string;
}

export function PaginationInfo({ currentPage, limit, total, itemName = 'عنصر' }: PaginationInfoProps) {
  const start = ((currentPage - 1) * limit) + 1;
  const end = Math.min(currentPage * limit, total);
  
  return (
    <div className="text-sm text-stone-500">
      عرض {start} - {end} من {total} {itemName}
    </div>
  );
}
