import React, { useEffect } from 'react';
import { ChevronUp, ChevronDown, Maximize2, X } from 'lucide-react';

export interface SplitPeekDossierProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentIndex?: number;
  totalCount?: number;
  onNext?: () => void;
  onPrev?: () => void;
  onExpandFull?: () => void;
  className?: string;
  queueLabel?: string;
}

/**
 * SplitPeekDossier: Non-modal 60/40 split peek dossier panel.
 * - Desktop (lg:flex): Docked right panel alongside the table without dark backdrop, keeping table active.
 * - Mobile / tablet (< lg): Slide-over drawer with dark backdrop overlay.
 */
export const SplitPeekDossier: React.FC<SplitPeekDossierProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  currentIndex,
  totalCount,
  onNext,
  onPrev,
  onExpandFull,
  className = '',
  queueLabel = 'Lead',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.stopPropagation?.();
        e.preventDefault?.();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const hasQueue = currentIndex !== undefined && totalCount !== undefined && totalCount > 0;
  const itemNumber = (currentIndex ?? 0) + 1;
  const isPrevDisabled = !onPrev || (currentIndex !== undefined && currentIndex <= 0);
  const isNextDisabled = !onNext || (currentIndex !== undefined && totalCount !== undefined && currentIndex >= totalCount - 1);

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay (< lg) */}
      <div
        data-testid="split-peek-backdrop"
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/40 backdrop-blur-xs transition-opacity"
      />

      {/* Docked Right Panel (Desktop lg:flex) / Slide-over Drawer (Mobile < lg) */}
      <aside
        role="region"
        aria-label={title || 'Record Dossier'}
        className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-[480px] lg:static lg:inset-auto w-full lg:w-[440px] xl:w-[480px] shrink-0 border-l border-slate-200/90 bg-white h-full flex flex-col z-20 shadow-sm relative ${className}`.trim()}
      >
        {/* Header */}
        <header className="px-4 py-3 border-b border-slate-200/90 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold text-slate-900 truncate" title={title}>
                {title}
              </h2>
              {hasQueue && (
                <span
                  data-testid="queue-counter"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 tabular-nums"
                >
                  {`${queueLabel} ${itemNumber} of ${totalCount}`}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate mt-0.5" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Queue Navigation Buttons */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
              <button
                type="button"
                onClick={onPrev}
                disabled={isPrevDisabled}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40 cursor-pointer"
                aria-label="Previous record"
                title="Previous record"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={onNext}
                disabled={isNextDisabled}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40 cursor-pointer"
                aria-label="Next record"
                title="Next record"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Expand Full Button */}
            {onExpandFull && (
              <button
                type="button"
                onClick={onExpandFull}
                className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40 cursor-pointer"
                aria-label="Expand full"
                title="Expand full screen"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/40 cursor-pointer"
              aria-label="Close dossier"
              title="Close dossier (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
};
