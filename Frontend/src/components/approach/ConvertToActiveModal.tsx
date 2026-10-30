import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { convertClientToActive } from '@/services/approachLogService';
import { getStoredSession } from '@/services/authService';
import { useToast } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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

  // Default to today's date in YYYY-MM-DD format
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartDate(new Date().toISOString().split('T')[0]);
      setNote('');
      setShowConfirmDialog(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmDialog, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!startDate || !startDate.trim()) {
      setErrorMessage('Effective start date is required.');
      return;
    }

    // Intercept with confirmation dialog so accidental clicks can be cancelled
    setShowConfirmDialog(true);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await convertClientToActive(entityType, entityId, {
        start_date: startDate.trim(),
        note: note.trim() || null,
      });

      showToast(`Successfully converted "${companyName}" to Active!`, 'success');
      setShowConfirmDialog(false);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert client to active.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      setShowConfirmDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-active-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-200" />
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
            <div className="relative">
              <input
                id="active-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                required
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
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
          <div className="flex items-center justify-end gap-2.5 pt-3">
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
        </form>
      </div>

      {/* Confirmation Dialog for Accidental Click Prevention */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleFinalConfirm}
        title="Confirm Customer Activation"
        description={
          <div className="space-y-2.5">
            <p>
              Are you sure you want to convert{' '}
              <strong className="text-slate-900 font-semibold">{companyName}</strong> to an{' '}
              <strong className="text-emerald-700 font-semibold">Active Customer</strong>?
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Effective Start Date: </span>
                <span className="font-semibold text-emerald-800">{startDate}</span>
              </div>
              {note.trim() && (
                <div className="truncate">
                  <span className="text-slate-500 font-medium">Handover Notes: </span>
                  <span className="italic">"{note.trim()}"</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              This will transition the customer from Inactive to Active and record a permanent activation milestone in the outreach history.
            </p>
          </div>
        }
        confirmText="Yes, Convert to Active"
        cancelText="Cancel"
        variant="emerald"
        isLoading={isSubmitting}
      />
    </div>
  );
};
