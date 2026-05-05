'use client';

import { useState, useRef, useEffect } from 'react';

interface GenderSelectProps {
  value: string;
  onChange: (value: 'MALE' | 'FEMALE') => void;
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'أخوة' },
  { value: 'FEMALE', label: 'أخوات' },
];

export default function GenderSelect({
  value,
  onChange,
  label,
  error,
  required,
  placeholder = 'اختر',
}: GenderSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = GENDER_OPTIONS.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-xl text-right flex items-center justify-between transition-all duration-200 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]'
        } bg-white/80 text-gray-800`}
      >
        <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
            style={{ direction: 'rtl' }}
          >
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value as 'MALE' | 'FEMALE');
                  setIsOpen(false);
                }}
                className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors ${
                  value === option.value ? 'bg-[#1a3a2f] text-white' : 'text-gray-800'
                }`}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
