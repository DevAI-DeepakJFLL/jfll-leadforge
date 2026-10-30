import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
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
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightConfirm, setHighlightConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setIsConfirmed(false);
      setErrorMessage(null);
      setHighlightConfirm(false);
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
  }, [isOpen, isSubmitting, startDate, note, isConfirmed, onClose]);

  if (!isOpen) return null;

  const executeConversion = async () => {
    setErrorMessage(null);

    if (!startDate || !startDate.trim()) {
      setErrorMessage('Effective start date is required.');
      dateInputRef.current?.focus();
      return;
    }

    if (!isConfirmed) {
      setHighlightConfirm(true);
      setErrorMessage('Please check the confirmation box to authorize customer activation.');
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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Crisp Modern Enterprise Design */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
              <Building2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="convert-active-title" className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  Convert to Active Customer
                </h2>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                  Activation Milestone
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate max-w-xs" title={companyName}>
                Re-classify <span className="font-medium text-slate-800">{companyName}</span> into active billing master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Target Account Transition Strip */}
          <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate" title={companyName}>
                {companyName}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                  {entityType === 'datamyne' ? 'Datamyne Lead' : 'JFLL Customer'}
                </span>
                <span>•</span>
                <span>ID: {entityId}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px] shadow-2xs font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="text-slate-600">Inactive</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-emerald-700 font-bold">Active Customer</span>
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
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all cursor-pointer"
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
              placeholder="e.g. Commercial rate agreement confirmed for air cargo ex-BOM to DXB; assigned to sales desk..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none"
            />
          </div>

          {/* The Redesigned Confirm Box (Interactive Authorization Checkpoint) */}
          <div
            className={`rounded-xl border transition-all duration-200 p-3.5 select-none ${
              isConfirmed
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/10'
                : highlightConfirm
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="pt-0.5">
                <input
                  type="checkbox"
                  checked={isConfirmed}
                  onChange={(e) => {
                    setIsConfirmed(e.target.checked);
                    if (e.target.checked) {
                      setHighlightConfirm(false);
                      setErrorMessage(null);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <ShieldCheck
                      className={`w-4 h-4 transition-colors ${
                        isConfirmed ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span>Confirmation & Authorization</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                      isConfirmed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                        : highlightConfirm
                        ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {isConfirmed ? 'Verified' : 'Sign-Off Required'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                  I verify that commercial terms are finalized for <strong className="text-slate-900">{companyName}</strong>. Transitioning updates Jet Freight's active master effective <strong className="text-emerald-800 font-semibold">{startDate || 'selected date'}</strong> and permanently retains all outreach logs.
                </p>
              </div>
            </label>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
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
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded text-slate-600 font-mono">⌘+Enter</kbd> to confirm
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                  isConfirmed
                    ? 'text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    : 'text-emerald-800 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 border border-emerald-300'
                }`}
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

export default ConvertToActiveModal;
