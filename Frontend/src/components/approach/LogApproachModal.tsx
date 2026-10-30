import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  Loader2,
  PhoneCall,
  User,
  X,
} from 'lucide-react';
import {
  ALL_SALES_ACTIONS,
  FUNNEL_RANKS,
  MANDATORY_NOTE_STATUSES,
  STANDARD_SELECTABLE_STATUSES,
  SalesAction,
  SalesStatus,
} from '@/types/approachLog';
import { logApproachActivity } from '@/services/approachLogService';
import { getStoredSession } from '@/services/authService';
import { useToast } from '@/components/ui';
import { SalesStatusBadge } from './SalesStatusBadge';

export interface LogApproachModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'datamyne' | 'jfll_customer';
  entityId: string;
  companyName: string;
  currentStatus: SalesStatus;
  onSuccess?: (newStatus: SalesStatus) => void;
}

export const LogApproachModal: React.FC<LogApproachModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  companyName,
  currentStatus = 'Not Contacted',
  onSuccess,
}) => {
  const { showToast } = useToast();
  const session = getStoredSession();

  const [action, setAction] = useState<SalesAction>('Called customer');
  const [selectedStatus, setSelectedStatus] = useState<SalesStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial status when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStatus(currentStatus);
      setAction('Called customer');
      setNote('');
      setErrorMessage(null);
    }
  }, [isOpen, currentStatus]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentRank = FUNNEL_RANKS[currentStatus] ?? 0;
  const selectedRank = FUNNEL_RANKS[selectedStatus] ?? 0;
  const isBackward = selectedRank < currentRank;
  const isMandatoryStatus = MANDATORY_NOTE_STATUSES.has(selectedStatus);
  const isNoteRequired = isBackward || isMandatoryStatus;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedNote = note.trim();
    if (isNoteRequired && !trimmedNote) {
      if (isBackward) {
        setErrorMessage(`An explanatory note is required when moving backward from '${currentStatus}' to '${selectedStatus}'.`);
      } else {
        setErrorMessage(`An explanatory note is required when setting status to '${selectedStatus}'.`);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await logApproachActivity(entityType, entityId, {
        action,
        status: selectedStatus,
        note: trimmedNote || null,
      });

      showToast(`Logged approach: ${action} (${selectedStatus})`, 'success');
      onSuccess?.(result.current_status);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log approach activity.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-approach-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-apollo/10 text-apollo flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5 text-apollo" />
            </div>
            <div>
              <h2 id="log-approach-title" className="text-base font-bold text-slate-900 leading-tight">
                Log Sales Approach
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs mt-0.5" title={companyName}>
                {companyName}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Current Status Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <span className="font-medium text-slate-600">Current Status:</span>
            <SalesStatusBadge status={currentStatus} size="sm" />
          </div>

          {/* Action Dropdown */}
          <div>
            <label htmlFor="approach-action-select" className="block text-xs font-semibold text-slate-800 mb-1.5">
              Action Performed <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="approach-action-select"
                value={action}
                onChange={(e) => setAction(e.target.value as SalesAction)}
                className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-apollo/20 focus:border-apollo transition-all cursor-pointer"
                required
              >
                {ALL_SALES_ACTIONS.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Status Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="approach-status-select" className="block text-xs font-semibold text-slate-800">
                New Status <span className="text-rose-500">*</span>
              </label>
              {/* Direction Indicator Badge */}
              {selectedStatus !== currentStatus && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isBackward
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isBackward ? (
                    <>
                      <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                      Backward (Note Required)
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                      Advancing Funnel
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <select
                id="approach-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SalesStatus)}
                className={`w-full appearance-none px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-800 shadow-2xs focus:outline-hidden focus:ring-2 transition-all cursor-pointer ${
                  isBackward
                    ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-apollo/20 focus:border-apollo'
                }`}
                required
              >
                {STANDARD_SELECTABLE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Note Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="approach-note-textarea" className="block text-xs font-semibold text-slate-800">
                Activity Note{' '}
                {isNoteRequired ? (
                  <span className="text-rose-600 font-bold">* (Mandatory)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Optional)</span>
                )}
              </label>
              <span className="text-[10px] text-slate-400">{note.length} / 2000</span>
            </div>
            <textarea
              id="approach-note-textarea"
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isNoteRequired
                  ? 'Please explain the reason for this status change...'
                  : 'Enter conversation summary, quotes discussed, or next steps...'
              }
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:ring-2 transition-all resize-none ${
                isNoteRequired && !note.trim()
                  ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-500 bg-amber-50/15'
                  : 'border-slate-300 focus:ring-apollo/20 focus:border-apollo'
              }`}
            />
            {isNoteRequired && (
              <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>
                  {isBackward
                    ? 'A note is required when moving backward in the funnel.'
                    : `A note is required when marking a lead as ${selectedStatus}.`}
                </span>
              </p>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Salesperson Attribution Info */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Logged as:{' '}
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-apollo hover:bg-apollo/90 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Log</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
