'use client';

import { useState, useCallback, useRef } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface UseConfirmDialogReturn {
  isOpen: boolean;
  options: ConfirmOptions;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleClose: () => void;
}

/**
 * Hook providing an imperative `confirm(options)` that returns a Promise<boolean>.
 *
 * Usage:
 * ```tsx
 * const { confirm, isOpen, options, handleConfirm, handleClose } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ message: 'هل أنت متأكد؟', variant: 'danger' });
 *   if (!ok) return;
 *   // proceed with deletion
 * };
 *
 * return (
 *   <>
 *     <ConfirmDialog
 *       isOpen={isOpen}
 *       onClose={handleClose}
 *       onConfirm={handleConfirm}
 *       {...options}
 *     />
 *   </>
 * );
 * ```
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: '',
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return { isOpen, options, confirm, handleConfirm, handleClose };
}
