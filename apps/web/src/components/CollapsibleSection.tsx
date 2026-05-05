'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  headerAction?: ReactNode;
  subtitle?: string;
}

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  headerAction,
  subtitle,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex justify-between items-center p-8 cursor-pointer select-none text-right"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={22}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? '' : 'rotate-90'}`}
          />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        {headerAction && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerAction}
          </div>
        )}
      </button>
      {isOpen && (
        <div className="px-8 pb-8">
          {children}
        </div>
      )}
    </div>
  );
}
