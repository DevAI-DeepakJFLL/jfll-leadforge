import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'emerald' | 'amber' | 'rose' | 'blue';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'emerald',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    emerald: {
      iconBg: 'bg-emerald-100 text-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
    },
    amber: {
      iconBg: 'bg-amber-100 text-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
    },
    rose: {
      iconBg: 'bg-rose-100 text-rose-700',
      btn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white',
    },
    blue: {
      iconBg: 'bg-blue-100 text-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
    },
  }[variant];

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${variantStyles.iconBg} shadow-xs`}
          >
            {variant === 'emerald' ? (
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            ) : variant === 'rose' ? (
              <AlertCircle className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <HelpCircle className="w-5 h-5 stroke-[2.2]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <div id="confirm-dialog-desc" className="mt-2 text-xs text-slate-600 leading-relaxed">
              {description}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer ${variantStyles.btn}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
