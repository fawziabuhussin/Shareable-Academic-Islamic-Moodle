'use client';

import { useState, useRef, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  getYear,
  setYear,
  setMonth,
  getMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ar } from 'date-fns/locale';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
  error?: string;
  required?: boolean;
}

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function DatePicker({
  value,
  onChange,
  placeholder = 'اختر تاريخ',
  maxDate,
  minDate,
  label,
  error,
  required,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value || new Date());
  const [showYearSelect, setShowYearSelect] = useState(false);
  const [showMonthSelect, setShowMonthSelect] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowYearSelect(false);
        setShowMonthSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate years for selection (1900 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  // Get calendar days
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isDateDisabled = (date: Date) => {
    if (maxDate && date > maxDate) return true;
    if (minDate && date < minDate) return true;
    return false;
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(date);
      setIsOpen(false);
    }
  };

  const handleYearSelect = (year: number) => {
    setViewDate(setYear(viewDate, year));
    setShowYearSelect(false);
  };

  const handleMonthSelect = (month: number) => {
    setViewDate(setMonth(viewDate, month));
    setShowMonthSelect(false);
  };

  const goToPrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const goToNextMonth = () => setViewDate(addMonths(viewDate, 1));

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[#1a3a2f]/80 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Input button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-xl text-right flex items-center justify-between transition-all duration-200 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-200 focus:ring-2 focus:ring-[#1a3a2f]/20 focus:border-[#1a3a2f]'
        } bg-white/80 text-gray-800`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? format(value, 'dd/MM/yyyy') : placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Calendar dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-full min-w-[300px]"
          style={{ direction: 'rtl' }}
        >
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {/* Month selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMonthSelect(!showMonthSelect);
                    setShowYearSelect(false);
                  }}
                  className="px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  {MONTHS[getMonth(viewDate)]}
                </button>
                {showMonthSelect && (
                  <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 min-w-[120px]">
                    {MONTHS.map((month, index) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => handleMonthSelect(index)}
                        className={`w-full text-right px-3 py-2 hover:bg-gray-100 transition-colors ${
                          getMonth(viewDate) === index ? 'bg-[#1a3a2f] text-white' : ''
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Year selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearSelect(!showYearSelect);
                    setShowMonthSelect(false);
                  }}
                  className="px-3 py-1 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  {getYear(viewDate)}
                </button>
                {showYearSelect && (
                  <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 min-w-[80px]">
                    {years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleYearSelect(year)}
                        className={`w-full text-center px-3 py-2 hover:bg-gray-100 transition-colors ${
                          getYear(viewDate) === year ? 'bg-[#1a3a2f] text-white' : ''
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const isSelected = value && isSameDay(day, value);
              const isCurrentMonth = isSameMonth(day, viewDate);
              const isDisabled = isDateDisabled(day);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    p-2 text-center rounded-lg transition-colors text-sm
                    ${isSelected
                      ? 'bg-[#1a3a2f] text-white'
                      : isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isCurrentMonth
                      ? 'hover:bg-gray-100 text-gray-800'
                      : 'text-gray-400 hover:bg-gray-50'
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null as any);
                setIsOpen(false);
              }}
              className="w-full mt-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              مسح التاريخ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
