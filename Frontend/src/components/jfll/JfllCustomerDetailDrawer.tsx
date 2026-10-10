import React, { useEffect } from 'react';
import {
  X,
  Building2,
  Mail,
  Phone,
  User,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { JfllCustomer } from '@/types/jfllCustomer';
import { JfllCustomerGroupBadge } from './JfllCustomerGroupBadge';
import { IndiaFlagIcon, formatPhoneNumber } from './JfllCustomerTable';
import { useToast } from '@/components/ui';

export interface JfllCustomerDetailDrawerProps {
  isOpen: boolean;
  customer: JfllCustomer | null;
  onClose: () => void;
  className?: string;
}

export const JfllCustomerDetailDrawer: React.FC<JfllCustomerDetailDrawerProps> = ({
  isOpen,
  customer,
  onClose,
  className = '',
}) => {
  const { showToast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  // Generate company initials
  const initials = customer.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${className}`}
        >
          {/* Header */}
          <div className="p-5 border-b border-surface-border bg-slate-50/70 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-sm shrink-0">
                {initials || <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h2
                  id="slide-over-title"
                  className="text-base font-bold text-slate-900 truncate leading-snug"
                  title={customer.fullName}
                >
                  {customer.fullName}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <JfllCustomerGroupBadge group={customer.customerGroup} />
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {customer.type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Account
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              aria-label="Close customer profile"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
            {/* Contact Person Section */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-apollo" />
                  <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                    Primary Contact
                  </span>
                </div>
                {customer.contactPersonName && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              {customer.contactPersonName ? (
                <div className="text-sm font-semibold text-slate-900 mb-3">
                  {customer.contactPersonName}
                </div>
              ) : (
                <div className="text-slate-400 italic mb-3">
                  No individual contact person assigned.
                </div>
              )}

              {/* Mobile Phone */}
              {/* Mobile Phone */}
              <div className="flex items-center justify-between py-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">Mobile Phone:</span>
                </div>
                {customer.mobileNumber ? (
                  (() => {
                    const phoneData = formatPhoneNumber(customer.mobileNumber);
                    if (!phoneData) return <span className="text-slate-400">—</span>;
                    return (
                      <div className="flex items-center gap-1.5">
                        <IndiaFlagIcon className="w-4 h-3 shrink-0" />
                        <a
                          href={`tel:${phoneData.raw}`}
                          className="font-mono text-apollo hover:underline"
                        >
                          {phoneData.number}
                        </a>
                        <button
                          onClick={() => handleCopyText(phoneData.raw, 'Phone')}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-2 border-t border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-600">Email:</span>
                </div>
                {customer.email ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-apollo hover:underline truncate max-w-[180px]"
                      title={customer.email}
                    >
                      {customer.email}
                    </a>
                    <button
                      onClick={() => handleCopyText(customer.email!, 'Email')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Copy email"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* Operational Logistics Profile */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Account Details
              </h3>

              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Business Segment</span>
                  <span className="font-medium text-slate-900">{customer.customerGroup}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Registration Type</span>
                  <span className="font-medium text-slate-900">{customer.type}</span>
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-slate-500">Account Status</span>
                  <span className="text-emerald-700 font-semibold">{customer.status}</span>
                </div>
              </div>
            </div>

            {/* Direct Outreach CTAs */}
            <div className="pt-2 space-y-2">
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="w-full py-2.5 px-4 bg-apollo hover:bg-apollo-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Direct Email</span>
                </a>
              )}
              {customer.mobileNumber && (
                <a
                  href={`tel:${customer.mobileNumber}`}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-600" />
                  <span>Call {customer.mobileNumber}</span>
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
