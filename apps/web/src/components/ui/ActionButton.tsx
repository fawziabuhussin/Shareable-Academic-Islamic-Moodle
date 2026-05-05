'use client';

import Link from 'next/link';
import { EditIcon, EyeIcon, TrashIcon } from '@/components/Icons';
import { cn } from '@/lib/utils';

export type ActionType = 'delete' | 'edit' | 'view';

const actionConfig: Record<
  ActionType,
  { icon: React.ReactNode; variantClass: string; iconSize: number }
> = {
  delete: {
    icon: <TrashIcon />,
    variantClass:
      'bg-red-50 text-red-600 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]',
    iconSize: 16,
  },
  edit: {
    icon: <EditIcon />,
    variantClass:
      'bg-sky-50 text-sky-600 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]',
    iconSize: 16,
  },
  view: {
    icon: <EyeIcon />,
    variantClass:
      'bg-stone-100 text-stone-600 hover:bg-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]',
    iconSize: 16,
  },
};

const baseClass =
  'touch-btn inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition min-h-[44px]';

export interface ActionButtonProps {
  action: ActionType;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
}

export function ActionButton({
  action,
  label,
  onClick,
  href,
  disabled = false,
  loading = false,
  className,
  title,
}: ActionButtonProps) {
  const config = actionConfig[action];
  const content = (
    <>
      <span className="inline-flex shrink-0 w-4 h-4 [&>svg]:w-full [&>svg]:h-full" aria-hidden>
        {config.icon}
      </span>
      {loading ? <span>...</span> : <span>{label}</span>}
    </>
  );

  const combinedClass = cn(baseClass, config.variantClass, disabled && 'opacity-50 cursor-not-allowed', className);
  const effectiveTitle = title ?? label;

  if (href && !disabled && !onClick) {
    return (
      <Link href={href} className={combinedClass} title={effectiveTitle}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClass}
      title={effectiveTitle}
      aria-label={label}
    >
      {content}
    </button>
  );
}

export default ActionButton;
