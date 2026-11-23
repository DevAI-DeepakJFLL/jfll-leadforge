import React, { useEffect, useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  X,
  Building2,
  Phone,
  Smartphone,
  User,
  Copy,
  ShieldCheck,
  Layers,
  CreditCard,
  TrendingUp,
  Network,
  Check,
  MoreHorizontal,
} from 'lucide-react';
import { JfllCustomer } from '@/types/jfllCustomer';
import { JfllCustomerGroupBadge } from './JfllCustomerGroupBadge';
import { useToast } from '@/components/ui';
import { parseAndFormatContactNumbers } from '@/utils/phoneUtils';
import { SalesApproachTimeline, SalesStatusBadge } from '@/components/approach';
import { getCachedApproachStatus } from '@/services/approachLogService';

export interface JfllCustomerDetailDrawerProps {
  isOpen: boolean;
  customer: JfllCustomer | null;
  onClose: () => void;
  onLogApproach?: (customer: JfllCustomer) => void;
  onConvertToActive?: (customer: JfllCustomer) => void;
  className?: string;
}

export const JfllCustomerDetailDrawer: React.FC<JfllCustomerDetailDrawerProps> = ({
  isOpen,
  customer,
  onClose,
  onLogApproach,
  onConvertToActive,
  className = '',
}) => {
  const { showToast } = useToast();
  const isActive = customer?.status === 'Active';
  const [activeTab, setActiveTab] = useState<'contacts' | 'commercial' | 'funnel' | 'merged'>(
    isActive ? 'contacts' : 'funnel'
  );
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customer) {
      setActiveTab(customer.status === 'Active' ? 'contacts' : 'funnel');
      setIsMoreMenuOpen(false);
    }
  }, [customer?.id, customer?.status]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside and Escape listener to close More menu
  useClickOutside(moreMenuRef, () => setIsMoreMenuOpen(false), isMoreMenuOpen);

  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  // Generate company initials
  const initials = (customer.fullName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  // Parse and categorize phone numbers into Mobile Numbers (+91) vs Landlines (022 / STD)
  const contactNumbers = parseAndFormatContactNumbers(customer.mobileNumber, customer.territory);
  const hasMergedEntities = Boolean(customer.mergedCount && customer.mergedCount > 1);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className={`w-screen max-w-full sm:max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${className}`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                  {initials || <Building2 className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h2
                    id="slide-over-title"
                    className="text-base sm:text-lg font-bold text-slate-900 truncate leading-snug"
                    title={customer.fullName}
                  >
                    {customer.fullName}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <JfllCustomerGroupBadge group={customer.customerGroup} />
                    <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {customer.type}
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Inactive Account
                      </span>
                    )}
                    {customer.inDataMyne && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                        <Layers className="w-3 h-3 text-sky-600" />
                        DataMyne Trade
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close customer profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bento Key Metric Strip */}
            <div className="grid grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-slate-200/70">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isActive ? 'Lifetime Biz' : 'Prior Biz'}
                </div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 truncate">
                  ₹{(customer.totalBusinessTillDate ?? customer.groupTotalBusiness)?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) ?? '—'}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isActive ? 'Last 3 Mo' : 'Account Status'}
                </div>
                <div className={`font-mono font-bold text-xs mt-0.5 truncate ${isActive ? 'text-blue-700' : 'text-amber-700'}`}>
                  {isActive
                    ? customer.businessLast3m !== undefined && customer.businessLast3m !== null
                      ? `₹${customer.businessLast3m.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
                      : '—'
                    : 'Dormant'}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sales Rep</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5 truncate" title={customer.salesPerson || ''}>
                  {customer.salesPerson || 'Unassigned'}
                </div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credit</div>
                <div className="font-semibold text-xs mt-0.5 truncate uppercase">
                  {customer.creditStatus ? (
                    <span className={customer.creditStatus === 'approved' ? 'text-emerald-700' : 'text-amber-700'}>
                      {customer.creditStatus.replace(/_/g, ' ')}
                    </span>
                  ) : (
                    <span className="text-slate-500">Regular</span>
                  )}
                </div>
              </div>
            </div>

            {/* Apple HIG Segmented Navigation */}
            <div className="mt-3.5 bg-slate-200/70 p-1 rounded-xl flex items-center gap-1" role="tablist" aria-label="Customer navigation">
              {isActive ? (
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'contacts'}
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                      activeTab === 'contacts'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Account & Contact
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'commercial'}
                    onClick={() => setActiveTab('commercial')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                      activeTab === 'commercial'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Commercial Breakdown
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'funnel'}
                    onClick={() => setActiveTab('funnel')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                      activeTab === 'funnel'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Win-Back Funnel
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'contacts'}
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                      activeTab === 'contacts'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Account Profile
                  </button>
                </>
              )}

              {hasMergedEntities && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'merged'}
                  onClick={() => setActiveTab('merged')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                    activeTab === 'merged'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Master Tree</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                    {customer.mergedCount}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700">
            {/* TAB: CONTACT PERSON & ACCOUNT (Active Default / Inactive Secondary) */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                {/* Contact Person Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Primary Account Contact
                      </span>
                    </div>
                    {customer.contactPersonName && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Verified Contact
                      </span>
                    )}
                  </div>

                  {customer.contactPersonName ? (
                    <div className="text-sm font-bold text-slate-900">
                      {customer.contactPersonName}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic">
                      No individual contact person assigned.
                    </div>
                  )}

                  {/* Categorized Phone Numbers */}
                  {contactNumbers.length > 0 ? (
                    contactNumbers.map((num, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 border-t border-slate-200/60"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {num.type === 'mobile' ? (
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          )}
                          <span className="text-slate-600 font-medium text-[11px] shrink-0">
                            {num.label}:
                          </span>
                          <span
                            className={`text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded border shrink-0 ${
                              num.type === 'mobile'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {num.type === 'mobile' ? '+91 Mobile' : `STD ${num.prefix}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-slate-800 font-semibold text-xs select-all">
                            {num.display}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(num.dialValue, num.label)}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                            title={`Copy ${num.label}`}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between py-1.5 border-t border-slate-200/60 text-slate-400 italic">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-300" />
                        <span>Contact Number:</span>
                      </span>
                      <span>Not on file</span>
                    </div>
                  )}

                  {/* Email */}
                  <div className="flex items-center justify-between py-1.5 border-t border-slate-200/60">
                    <span className="text-slate-600 font-medium text-[11px]">Email:</span>
                    {customer.email ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-slate-800 truncate max-w-[200px] font-mono text-xs select-all"
                          title={customer.email}
                        >
                          {customer.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(customer.email!, 'Email')}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No email on file</span>
                    )}
                  </div>
                </div>

                {/* Account Logistics Profile Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-apollo" />
                    <span>Account Profile & Allocation</span>
                  </h3>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-500">Business Segment:</span>
                      <span className="font-semibold text-slate-900">{customer.customerGroup}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-500">Registration Type:</span>
                      <span className="font-semibold text-slate-900">{customer.type}</span>
                    </div>
                    {customer.salesPerson && (
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500">Account Sales Rep:</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-900">{customer.salesPerson}</span>
                          {customer.coReps && (
                            <div className="text-[10px] text-slate-500">
                              Co-Reps: {customer.coReps}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {customer.creditStatus && (
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>Credit Status:</span>
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide ${
                            customer.creditStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : customer.creditStatus === 'blocked'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {customer.creditStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: COMMERCIAL BREAKDOWN (Active Accounts) */}
            {activeTab === 'commercial' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
                  <div className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Billing & Revenue Performance</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Revenue (Last 3 Mo)
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                        ₹{customer.businessLast3m?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '—'}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        Total Business (FY)
                      </div>
                      <div className="font-mono font-bold text-blue-700 text-sm mt-1">
                        ₹{customer.totalBusinessTillDate?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: WIN-BACK FUNNEL (Inactive Accounts Default) */}
            {activeTab === 'funnel' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Win-Back Sales Outreach & History
                      </span>
                    </div>
                    <SalesStatusBadge status={getCachedApproachStatus('jfll_customer', customer.id)} size="sm" />
                  </div>

                  <SalesApproachTimeline
                    entityType="jfll_customer"
                    entityId={customer.id}
                    companyName={customer.fullName}
                    onOpenLogModal={() => onLogApproach?.(customer)}
                    onOpenConvertModal={() => onConvertToActive?.(customer)}
                    showConvertButton={true}
                  />
                </div>
              </div>
            )}

            {/* TAB: MASTER ENTITY TREE (When mergedCount > 1) */}
            {activeTab === 'merged' && hasMergedEntities && (
              <div className="space-y-4">
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Unified Golden Master Account
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {customer.mergedCount} Trade Entities Merged
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-slate-600 font-semibold text-xs">Consolidated Lifetime Business</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{(customer.totalBusinessTillDate ?? customer.groupTotalBusiness)?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) ?? '—'}
                    </span>
                  </div>

                  {customer.mergedAliases && customer.mergedAliases.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Merged Subsidiaries & Historical Rep Records ({customer.mergedAliases.length}):
                      </div>
                      {customer.mergedAliases.map((alias: any, idx: number) => (
                        <div
                          key={alias.id || idx}
                          className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">
                              {alias.fullName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className={alias.status === 'Active' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                {alias.status}
                              </span>
                              {alias.salesPerson && (
                                <>
                                  <span>•</span>
                                  <span>Rep: {alias.salesPerson}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono text-slate-400">ID: {alias.id}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono text-xs font-bold text-slate-800">
                            ₹{alias.totalBusiness?.toLocaleString('en-IN', { minimumFractionDigits: 0 }) ?? '0'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Frosted Glass Sticky Bottom Action Dock */}
          <div className="p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-lg relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {!isActive && onConvertToActive && (
                <button
                  type="button"
                  onClick={() => onConvertToActive(customer)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-xs transition-all min-h-[40px] truncate cursor-pointer"
                  title="Re-activate account to active booking status"
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Re-Activate Account</span>
                </button>
              )}

              {!isActive && onLogApproach && (
                <button
                  type="button"
                  onClick={() => onLogApproach(customer)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors min-h-[40px] shrink-0 cursor-pointer"
                  title="Log sales re-activation approach"
                >
                  <span>Log Outreach</span>
                </button>
              )}

              {isActive && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active Account</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(customer.id, 'Customer ID')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors min-h-[40px] cursor-pointer"
                    title="Copy Customer ID"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy ID: {customer.id}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Overflow More Menu */}
            <div className="relative shrink-0" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                aria-label="More actions"
                title="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Customer Options
                  </div>

                  {customer.mobileNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText(customer.mobileNumber!, 'Phone');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Primary Number</span>
                    </button>
                  )}

                  {customer.email && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText(customer.email!, 'Email');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Email</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleCopyText(customer.id, 'Customer ID');
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 border-t border-slate-100"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Customer ID</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
