import React from 'react';
import { Lead } from '@/types/lead';
import { CompanyAvatar } from './CompanyAvatar';
import { StatusBadge } from './StatusBadge';
import {
  Mail,
  Phone,
  Building2,
  Check,
  Copy,
  ShieldCheck,
  Send,
  User,
  X,
  Sparkles,
} from 'lucide-react';

export interface EmailRevealDialogProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onCopy?: (text: string, type: 'email' | 'phone') => void;
  onComposeEmail?: (lead: Lead) => void;
  onAddToSequence?: (lead: Lead) => void;
  onViewProfile?: (lead: Lead) => void;
}

import { useModalDismiss } from '@/hooks/useModalDismiss';
import { useClipboard } from '@/hooks/useClipboard';

export const EmailRevealDialog: React.FC<EmailRevealDialogProps> = ({
  isOpen,
  lead,
  onClose,
  onCopy,
  onComposeEmail,
  onAddToSequence,
  onViewProfile,
}) => {
  useModalDismiss({ isOpen, onClose });

  const { copy: copyToClipboard, isCopied } = useClipboard({
    onSuccess: (text, field) => {
      onCopy?.(text, field === 'email' ? 'email' : 'phone');
    },
  });

  if (!isOpen || !lead) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-reveal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <CompanyAvatar
              company={lead.company}
              logoBgColor={lead.logoBgColor}
              logoTextColor={lead.logoTextColor}
              logoInitials={lead.logoInitials}
              companyLogo={lead.companyLogo}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="email-reveal-title"
                  className="font-bold text-base text-slate-900 truncate leading-snug"
                >
                  {lead.name}
                </h3>
                <StatusBadge status={lead.status} />
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                {lead.title}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {lead.company} &bull; {lead.location}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Verified Email Card */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Mail className="w-4 h-4 text-apollo" />
                <span>Verified Work Email</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified 100% Deliverable</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-2xs">
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 select-all truncate">
                {lead.email}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(lead.email, 'email')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                title="Copy email to clipboard"
                aria-label="Copy email address"
              >
                {isCopied('email') ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Email deliverability metrics pills */}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SMTP Validated
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Mailbox Active
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Zero Bounce Guarantee
              </span>
            </div>
          </div>

          {/* Direct & HQ Phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Direct Phone */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Direct Dial</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-semibold text-slate-800 select-all truncate">
                  {lead.phone || 'Unavailable'}
                </span>
                {lead.phone && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(lead.phone, 'directPhone')}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo"
                    title="Copy direct phone"
                    aria-label="Copy direct phone"
                  >
                    {isCopied('directPhone') ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* HQ Phone */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Corporate HQ Phone</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-semibold text-slate-800 select-all truncate">
                  {lead.workPhone || lead.phone || 'Unavailable'}
                </span>
                {(lead.workPhone || lead.phone) && (
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(lead.workPhone || lead.phone, 'hqPhone')
                    }
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo"
                    title="Copy HQ phone"
                    aria-label="Copy corporate HQ phone"
                  >
                    {isCopied('hqPhone') ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {onViewProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewProfile(lead);
              }}
              className="inline-flex items-center justify-center sm:justify-start gap-1.5 py-1 text-xs font-medium text-slate-600 hover:text-apollo hover:underline min-h-[36px]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Open full dossier</span>
            </button>
          )}

          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            {onAddToSequence && (
              <button
                type="button"
                onClick={() => onAddToSequence(lead)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md shadow-2xs transition-colors min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Add to Sequence</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onComposeEmail) {
                  onComposeEmail(lead);
                } else {
                  window.location.href = `mailto:${lead.email}`;
                }
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-md shadow-sm transition-colors focus:outline-none min-h-[38px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailRevealDialog;
