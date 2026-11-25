import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Building2,
  FileSpreadsheet,
  UserCheck,
  Phone,
  Mail,
  Linkedin,
  Ship,
  FileText,
  Search,
} from 'lucide-react';
import { HotLead } from '@/types/hotLeads';
import { formatInrCurrency } from '@/services/hotLeadsService';

interface HotLeadDetailDrawerProps {
  isOpen: boolean;
  lead: HotLead | null;
  onClose: () => void;
  onNavigateToReport?: (companyName: string) => void;
  onFindInApollo?: (query: string) => void;
  onFindInDatamyne?: (query: string) => void;
}

export const HotLeadDetailDrawer: React.FC<HotLeadDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onNavigateToReport,
  onFindInApollo,
  onFindInDatamyne,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (typeof document !== 'undefined') {
        previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      }
    } else {
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus?.();
        previouslyFocusedElementRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const handleCopy = (text: string, fieldId: string) => {
    if (!text || text === '-') return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedField(fieldId);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch {
      // Fallback
    }
  };

  const getCrmStatusBadge = (status: string) => {
    if (status === 'Active Customer') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active Customer
        </span>
      );
    }
    if (status === 'Not Active Customer') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Inactive / Reactivation Target
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        Net-New Prospect
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity overscroll-contain"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <aside
        className="relative z-10 w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-[100svh] max-h-[100svh] text-slate-100 overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                #{lead.srNo}
              </span>
              {getCrmStatusBadge(lead.crmStatus)}
            </div>
            <h2 id="drawer-title" className="text-xl font-bold text-white tracking-tight leading-snug">
              {lead.customerName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>GSTIN: {lead.gstin}</span>
              <button
                type="button"
                onClick={() => handleCopy(lead.gstin, 'gstin')}
                className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Copy GSTIN"
              >
                {copiedField === 'gstin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card 1: Tax Turnover Audit */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Audited Tax Invoice Turnover</span>
              </div>
              <span className="text-xs font-medium text-slate-400">GST Reconciliation Ledger</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                {formatInrCurrency(lead.taxableTurnover)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                (₹{lead.taxableTurnover.toLocaleString('en-IN')})
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified operational freight billing extracted from client tax invoices. Cross-referenced against the internal CRM warehouse.
            </p>
          </div>

          {/* Card 2: Internal JFLL CRM Status */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>JFLL CRM Relationship</span>
              </div>
              <span className="text-xs text-slate-400">Internal Accounts Base</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Assigned Sales Rep</span>
                <span className="font-semibold text-white text-sm">
                  {lead.salesRep !== '-' ? lead.salesRep : 'None (Unassigned Target)'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">Internal Contact Person</span>
                <span className="font-semibold text-white text-sm">
                  {lead.contactPerson !== '-' ? lead.contactPerson : 'Not on file'}
                </span>
              </div>
            </div>

            {(lead.phone !== '-' || lead.email !== '-') && (
              <div className="pt-2 flex flex-wrap gap-4 text-xs">
                {lead.phone !== '-' && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.phone}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.phone, 'phone')}
                      className="p-1 hover:text-white rounded hover:bg-slate-700/50"
                      title="Copy Phone"
                    >
                      {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
                {lead.email !== '-' && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{lead.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.email, 'email')}
                      className="p-1 hover:text-white rounded hover:bg-slate-700/50"
                      title="Copy Email"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Apollo Decision Maker Profile */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Apollo Freight Intelligence</span>
              </div>
              {lead.apolloDomain !== '-' && (
                <span className="text-xs text-purple-400 font-mono">
                  {lead.apolloDomain}
                </span>
              )}
            </div>

            {lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-' ? (
              <div className="p-4 rounded-lg bg-slate-900/80 border border-purple-500/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {lead.apolloDecisionMaker}
                      {lead.emailStatus === 'Verified' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Verified Email
                        </span>
                      )}
                      {lead.emailStatus === 'Extrapolated' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Extrapolated
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">{lead.decisionMakerTitle}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {lead.apolloMatchedEntity !== '-' ? lead.apolloMatchedEntity : lead.customerName}
                      {lead.apolloEmployees !== '-' && ` • ${lead.apolloEmployees}`}
                    </p>
                  </div>

                  {lead.linkedinProfile && lead.linkedinProfile !== '-' && (
                    <a
                      href={lead.linkedinProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    >
                      <Linkedin className="w-3.5 h-3.5 fill-current" />
                      <span>LinkedIn</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {lead.decisionMakerEmail && lead.decisionMakerEmail !== '-' && (
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-800/80 border border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-mono text-slate-200">{lead.decisionMakerEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.decisionMakerEmail, 'dmEmail')}
                      className={`px-2 py-1 rounded font-medium flex items-center gap-1 transition-all ${
                        copiedField === 'dmEmail'
                          ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/50'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {copiedField === 'dmEmail' ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>No direct executive contact found in Apollo starter sample.</span>
                <button
                  type="button"
                  onClick={() => onFindInApollo?.(lead.customerName)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline"
                >
                  Search 15.5M Contacts →
                </button>
              </div>
            )}
          </div>

          {/* Card 4: Datamyne Customs Activity */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Ship className="w-4 h-4 text-cyan-400" />
                <span>Datamyne International Trade Activity</span>
              </div>
              <span className="text-xs text-slate-400">Customs Shipments</span>
            </div>

            {lead.datamyneTradeActivity && lead.datamyneTradeActivity !== '-' ? (
              <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-200">
                <span className="font-semibold block text-cyan-300 mb-1">Recorded Foreign Trade Volume:</span>
                <p className="leading-relaxed">{lead.datamyneTradeActivity}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No international customs shipment records cross-matched in the current Datamyne snapshot.
              </p>
            )}
          </div>
        </div>

        {/* Screen Reader Live Status Region */}
        <span role="status" aria-live="polite" className="sr-only">
          {copiedField ? `${copiedField} copied to clipboard` : ''}
        </span>

        {/* Sticky Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigateToReport?.(lead.customerName)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-950/40"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Client Report</span>
          </button>

          <button
            type="button"
            onClick={() => onFindInApollo?.(lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-' ? lead.apolloDecisionMaker : lead.customerName)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find in Apollo</span>
          </button>

          {lead.datamyneTradeActivity !== '-' && (
            <button
              type="button"
              onClick={() => onFindInDatamyne?.(lead.customerName)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 text-white transition-colors"
            >
              <Ship className="w-3.5 h-3.5" />
              <span>DataMyne Trade</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
