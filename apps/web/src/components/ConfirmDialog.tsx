'use client';

import Modal from './Modal';
import Button from './ui/Button';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: Info,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    buttonVariant: 'primary' as const,
  },
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`p-3 rounded-full ${config.iconBg}`}>
          <Icon className={`w-7 h-7 ${config.iconColor}`} />
        </div>

        {title && (
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        )}

        <p className="text-gray-600 leading-relaxed">{message}</p>

        <div className="flex items-center gap-3 w-full mt-2">
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={loading}
            fullWidth
          >
            {loading ? 'جارٍ...' : confirmText}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            fullWidth
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
