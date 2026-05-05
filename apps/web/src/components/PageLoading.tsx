'use client';

/**
 * PageLoading - Consistent loading state that prevents white flash
 * 
 * Instead of showing a full white page with a centered spinner,
 * this shows a proper page structure with the loading indicator
 * in the content area, preventing the jarring white flash.
 */

interface PageLoadingProps {
  /** Page title to show in header */
  title?: string;
  /** Subtitle/count to show in header */
  subtitle?: string;
  /** Icon component to show in header */
  icon?: React.ReactNode;
  /** Additional content to show while loading */
  children?: React.ReactNode;
}

export default function PageLoading({ 
  title = 'جاري التحميل...', 
  subtitle,
  icon,
  children 
}: PageLoadingProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - maintains visual stability */}
      <div className="bg-gradient-to-l from-[#1a3a2f] via-[#1f4a3d] to-[#0d2b24] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              {icon || <div className="w-5 h-5 bg-white/30 rounded animate-pulse" />}
            </div>
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-white/70 text-sm">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator in content area */}
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a3a2f]"></div>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * InlineLoading - For showing loading inside existing page structure
 */
export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a3a2f]"></div>
        {message && <p className="text-stone-500 text-sm">{message}</p>}
      </div>
    </div>
  );
}
