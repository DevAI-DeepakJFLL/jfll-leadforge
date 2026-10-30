import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { convertClientToActive } from '@/services/approachLogService';
import { getStoredSession } from '@/services/authService';
import { useToast } from '@/components/ui';

export interface ConvertToActiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'datamyne' | 'jfll_customer';
  entityId: string;
  companyName: string;
  onSuccess?: () => void;
}

export const ConvertToActiveModal: React.FC<ConvertToActiveModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  companyName,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const session = getStoredSession();
  const modalRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Default to today's date in YYYY-MM-DD format
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setErrorMessage(null);
      // Auto-focus on date input after modal mounts
      const timer = setTimeout(() => {
        dateInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard accessibility: Escape to dismiss, Cmd/Ctrl+Enter to submit, and Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Shortcut: Cmd+Enter or Ctrl+Enter submits
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isSubmitting) {
          executeConversion();
        }
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, startDate, note, onClose]);

  if (!isOpen) return null;

  const executeConversion = async () => {
    setErrorMessage(null);

    if (!startDate || !startDate.trim()) {
      setErrorMessage('Effective start date is required.');
      dateInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await convertClientToActive(entityType, entityId, {
        start_date: startDate.trim(),
        note: note.trim() || null,
      });

      showToast(`Successfully converted "${companyName}" to Active!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert client to active.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeConversion();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-active-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Authoritative Freight Enterprise styling */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 id="convert-active-title" className="text-base font-bold leading-tight">
                Convert to Active Customer
              </h2>
              <p className="text-xs text-emerald-100 truncate max-w-xs mt-0.5" title={companyName}>
                {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informational Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Activation Milestone</strong>
              This will transition the customer from Inactive to <strong>Active</strong> in Jet Freight's customer master, update their status across the portfolio, and permanently retain the entire outreach log history.
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="active-start-date" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Effective Active Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="active-start-date"
              ref={dateInputRef}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              The contract or booking start date when the customer resumes active shipments.
            </p>
          </div>

          {/* Optional Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="active-note-textarea" className="block text-xs font-semibold text-slate-800">
                Activation / Handover Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">{note.length} / 2000</span>
            </div>
            <textarea
              id="active-note-textarea"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Agreement signed for air cargo ex-BOM to DXB; assigned to commercial desk..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Inline Milestone & Audit Confirmation Card (replaces secondary modal) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 block">Verification & Audit Trail</span>
                <span className="text-slate-600 leading-normal">
                  Converting will re-classify <strong className="text-slate-900">{companyName}</strong> into Jet Freight's active billing master with effective date <strong className="text-emerald-800 font-medium">{startDate || 'today'}</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Coordinator Attribution */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Authorized by:{' '}
              <strong className="text-slate-700 font-medium">
                {session?.name || 'Sales Coordinator'}
              </strong>
            </span>
            <span className="font-mono text-[10px] text-slate-400">{session?.email || 'sales.coordinator@jfll.com'}</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono">⌘+Enter</kbd> to confirm
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Convert to Active</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
