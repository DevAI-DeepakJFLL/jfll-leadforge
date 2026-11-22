import React, { useEffect, useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
import {
  X,
  Building2,
  Phone,
  Smartphone,
  Copy,
  MapPin,
  PackageCheck,
  FileText,
  UserCheck,
  AlertCircle,
  Plane,
  Ship,
  Globe,
  Mail,
  Sparkles,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { DatamyneLead } from '@/types/datamyneLead';
import { Lead } from '@/types/lead';
import { DatamyneCategoryBadge } from './DatamyneCategoryBadge';
import { TierScoreBadge, TierScoreBreakdownModal } from '@/components/tiers';
import { TieredLead } from '@/types/tierSegmentation';
import { useToast } from '@/components/ui';
import { parseAndFormatContactNumbers } from '@/utils/phoneUtils';
import { SalesApproachTimeline, SalesStatusBadge } from '@/components/approach';
import { getCachedApproachStatus } from '@/services/approachLogService';
import { fetchApolloPeopleLeads } from '@/services/apolloService';
import {
  getContactInitials,
  getSeniorityBadge,
  extractDomainFromEmail,
  extractFirstDirectorName,
  cleanCustomsCompanyName,
} from '@/utils/apolloUtils';

export interface DatamyneDetailDrawerProps {
  isOpen: boolean;
  lead: DatamyneLead | null;
  onClose: () => void;
  onFindDecisionMakers?: (companyName: string, domain?: string, director?: string) => void;
  onLogApproach?: (lead: DatamyneLead) => void;
  onConvertToActive?: (lead: DatamyneLead) => void;
  onAssignToTracker?: (lead: DatamyneLead) => void;
  onGenerateReport?: (companyName: string, id?: string, source?: string) => void;
  initialIsLoadingContacts?: boolean;
  className?: string;
}

export const DatamyneDetailDrawer: React.FC<DatamyneDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onFindDecisionMakers,
  onLogApproach,
  onConvertToActive,
  onGenerateReport,
  initialIsLoadingContacts = false,
  className = '',
}) => {
  const { showToast } = useToast();
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [contacts, setContacts] = useState<Lead[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(initialIsLoadingContacts);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trade' | 'contacts' | 'funnel'>('trade');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef(lead);
  leadRef.current = lead;

  // Reset search and tab state when a new lead is selected or drawer reopens
  useEffect(() => {
    if (contacts.length > 0) setContacts([]);
    if (totalContacts !== 0) setTotalContacts(0);
    if (isLoadingContacts) setIsLoadingContacts(false);
    if (hasSearched) setHasSearched(false);
    setActiveTab('trade');
    setIsMoreMenuOpen(false);
  }, [lead?.id, isOpen]);

  // Click outside and Escape listener to close More menu
  useClickOutside(moreMenuRef, () => setIsMoreMenuOpen(false), isMoreMenuOpen);

  const handleFetchDecisionMakers = () => {
    if (!lead?.company_name) return;
    const currentLeadId = lead.id;
    setHasSearched(true);
    setIsLoadingContacts(true);
    setActiveTab('contacts');
    const domain = extractDomainFromEmail(lead.email);
    const cleaned = cleanCustomsCompanyName(lead.company_name);

    fetchApolloPeopleLeads({
      company: cleaned || lead.company_name,
      domain: domain || undefined,
      limit: 10,
    })
      .then((res) => {
        if (leadRef.current?.id !== currentLeadId) return;
        setContacts(res.items);
        setTotalContacts(res.totalEstimate);
        setIsLoadingContacts(false);
      })
      .catch(() => {
        if (leadRef.current?.id !== currentLeadId) return;
        setContacts([]);
        setTotalContacts(0);
        setIsLoadingContacts(false);
      });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow === 'hidden' ? 'auto' : (document.body.style.overflow || 'auto');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow === 'hidden' ? 'auto' : originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !lead) return null;

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  const initials = (lead.company_name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const corporateDomain = extractDomainFromEmail(lead.email);
  const directorName = extractFirstDirectorName(lead.directors);
  const cleanedCompany = cleanCustomsCompanyName(lead.company_name);

  const isMissingContact = lead.dataset_type === 'missing';
  const tieredLead = (lead as any).segment_status ? (lead as unknown as TieredLead) : null;

  // Parse and categorize phone numbers into Mobile Numbers (+91) vs Landlines (022 / STD)
  const contactNumbers = parseAndFormatContactNumbers(lead.phone, lead.city);
  const primaryCallNumber = contactNumbers.length > 0 ? contactNumbers[0].dialValue : null;

  // Clean split for multiple email addresses
  const emailList = lead.email
    ? lead.email
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  const reportSource = lead.country === 'Brazil' || lead.id.startsWith('dm-bra-') ? 'datamyne_brazil' : 'datamyne';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="datamyne-details-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className={`w-screen max-w-full sm:max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${className}`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-0.5">
                  {initials || <Building2 className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2
                    id="datamyne-details-title"
                    className="text-base font-bold text-slate-900 truncate leading-tight tracking-tight"
                    title={lead.company_name}
                  >
                    {lead.company_name}
                  </h2>
                  <div className="flex items-center flex-nowrap overflow-x-auto no-scrollbar gap-1.5 mt-1.5 py-0.5 text-[11px]">
                    {tieredLead && (
                      <div className="shrink-0">
                        <TierScoreBadge
                          status={tieredLead.segment_status}
                          score={tieredLead.total_score}
                          breakdown={tieredLead.score_breakdown}
                          onClick={() => setIsTierModalOpen(true)}
                        />
                      </div>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                        lead.role === 'Exporter'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : lead.role === 'Importer'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {lead.role === 'Both (Exporter & Importer)' || lead.role === 'Both'
                        ? 'Both (Exp & Imp)'
                        : lead.role}
                    </span>

                    {lead.transport_mode && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                          lead.transport_mode === 'Air'
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : lead.transport_mode === 'Ocean'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {lead.transport_mode === 'Air' ? (
                          <>
                            <Plane className="w-3 h-3 text-sky-600 shrink-0" />
                            <span>Air Freight</span>
                          </>
                        ) : lead.transport_mode === 'Ocean' ? (
                          <>
                            <Ship className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span>Ocean Freight</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-0.5 shrink-0">
                              <Plane className="w-2.5 h-2.5 text-indigo-600" />
                              <Ship className="w-2.5 h-2.5 text-indigo-600" />
                            </span>
                            <span>Multi-modal</span>
                          </>
                        )}
                      </span>
                    )}

                    <div className="shrink-0">
                      <DatamyneCategoryBadge category={lead.category} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  onClick={onClose}
                  className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="Close lead details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bento Trade Metric Strip */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-slate-200/70">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Shipments</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 truncate">
                  {lead.total_shipments != null ? lead.total_shipments.toLocaleString('en-US') : '—'}
                </div>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Traded USD</div>
                <div className="font-mono font-bold text-emerald-700 text-xs mt-0.5 truncate">
                  {lead.total_value_usd != null
                    ? `$${lead.total_value_usd.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                    : '—'}
                </div>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate" title="Customs Tax ID / IEC">Tax ID (IEC)</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 truncate" title={lead.tax_id || ''}>
                  {lead.tax_id || '—'}
                </div>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Last Active</div>
                <div className="font-mono font-semibold text-slate-800 text-xs mt-0.5 truncate" title={lead.latest_activity_date || ''}>
                  {lead.latest_activity_date || '—'}
                </div>
              </div>
            </div>

            {/* Apple HIG Segmented Navigation */}
            <div className="mt-3 bg-slate-200/70 p-1 rounded-xl flex items-center gap-1" role="tablist" aria-label="DataMyne details navigation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'trade'}
                onClick={() => setActiveTab('trade')}
                className={`flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg transition-all text-center truncate ${
                  activeTab === 'trade'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trade Profile
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'contacts'}
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg transition-all text-center truncate flex items-center justify-center gap-1 ${
                  activeTab === 'contacts'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Contacts</span>
                {totalContacts > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-apollo font-bold">
                    {totalContacts}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'funnel'}
                onClick={() => setActiveTab('funnel')}
                className={`flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg transition-all text-center truncate ${
                  activeTab === 'funnel'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales Funnel
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700">
            {/* TAB 1: TRADE & CHANNELS */}
            {activeTab === 'trade' && (
              <div className="space-y-4">
                {/* Missing Contacts Notice */}
                {isMissingContact && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5 shadow-2xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-900 text-xs">
                        No Direct Contact on File
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Direct phone and email were not included on customs manifests for this account.
                        Refer to registered address, IEC, or directors below, or discover executive contacts in the Apollo Verified Decision Makers card below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Apollo Verified Decision Makers Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Apollo Verified Decision Makers
                      </span>
                    </div>
                    {totalContacts > 0 && (
                      <span className="text-[11px] font-bold text-apollo bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {totalContacts} verified
                      </span>
                    )}
                  </div>

                  {!hasSearched && !isLoadingContacts ? (
                    <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-apollo border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-apollo" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            Discover Executive Contacts
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Query Apollo's 15.5M executive database for verified CXOs, Directors, and Logistics procurement heads at this shipper.
                          </p>
                        </div>
                      </div>

                      {/* Recognized Preview */}
                      {(corporateDomain || directorName) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                          <span className="text-slate-400 font-medium">Recognized:</span>
                          {corporateDomain && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-blue-700 font-mono text-[10px] rounded border border-blue-200">
                              <Globe className="w-2.5 h-2.5 text-blue-500" />
                              @{corporateDomain}
                            </span>
                          )}
                          {directorName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-purple-700 text-[10px] rounded border border-purple-200 font-medium">
                              <UserCheck className="w-2.5 h-2.5 text-purple-500" />
                              {directorName}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleFetchDecisionMakers}
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-apollo hover:bg-apollo-hover text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Get Apollo Verified Decision Maker</span>
                        </button>

                        {onFindDecisionMakers && (
                          <button
                            type="button"
                            onClick={() =>
                              onFindDecisionMakers(
                                cleanedCompany || lead.company_name,
                                corporateDomain || undefined,
                                directorName || undefined
                              )
                            }
                            className="text-[11px] font-semibold text-apollo hover:underline cursor-pointer"
                          >
                            Open Directory →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isLoadingContacts ? (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-2 py-7 animate-fade-in shadow-2xs">
                      <Loader2 className="w-6 h-6 text-apollo animate-spin" />
                      <div className="text-xs font-bold text-slate-900">
                        Checking from Apollo…
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Cross-referencing 15.5M executive database for verified CXOs, Directors, and Procurement decision makers...
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck className="w-4 h-4 text-apollo shrink-0" />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {totalContacts > 0
                            ? `${totalContacts} Apollo Verified Decision Makers Available`
                            : 'Search complete in Apollo directory'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('contacts')}
                        className="text-xs font-semibold text-apollo hover:underline shrink-0 cursor-pointer"
                      >
                        View in Contacts Tab →
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Manifest Outreach Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-apollo" />
                      <span>Customs Manifest Channels</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {lead.contact_type || 'Direct'}
                    </span>
                  </div>

                  {/* Phone Numbers */}
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
                            {num.type === 'mobile' ? '+91 Mobile' : num.prefix.startsWith('+') ? num.prefix : `STD ${num.prefix}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`tel:${num.dialValue}`}
                            className="font-mono text-apollo hover:underline font-semibold text-xs"
                            title={`Call ${num.display}`}
                          >
                            {num.display}
                          </a>
                          <button
                            onClick={() => handleCopyText(num.dialValue, num.label)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors"
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
                      <span>Not on manifest</span>
                    </div>
                  )}

                  {/* Email Addresses */}
                  {emailList.length > 0 ? (
                    emailList.map((email, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 border-t border-slate-200/60"
                      >
                        <span className="text-slate-600 font-medium text-[11px]">
                          Email:
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <a
                            href={`mailto:${email}`}
                            className="text-apollo hover:underline truncate max-w-[200px] text-xs font-mono"
                            title={email}
                          >
                            {email}
                          </a>
                          <button
                            onClick={() => handleCopyText(email, 'Email Address')}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded cursor-pointer transition-colors shrink-0"
                            title="Copy email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between py-1.5 border-t border-slate-200/60 text-slate-400 italic">
                      <span>Email Address:</span>
                      <span>Not on manifest</span>
                    </div>
                  )}

                  {/* Physical Address */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="text-slate-700 leading-snug">
                      <div>{lead.address || 'Address unlisted'}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {lead.city || '—'} {lead.pin_code ? `• PIN: ${lead.pin_code}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics & Cargo Profile Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                    <PackageCheck className="w-4 h-4 text-apollo" />
                    <span>Logistics & Trade Corridors</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Category</span>
                      <strong className="text-slate-900 text-xs font-bold block truncate">
                        {lead.category}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Subcategory</span>
                      <strong className="text-slate-900 text-xs font-bold block truncate" title={lead.subcategory}>
                        {lead.subcategory || 'General Trade'}
                      </strong>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border-t border-slate-100 text-xs pt-1">
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-500">Trade Corridors:</span>
                      <span className="font-semibold text-slate-900 text-right">{lead.trade_lanes || '—'}</span>
                    </div>
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-500">Customs Tax ID (IEC / PAN):</span>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {lead.tax_id || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Top HS Codes inline */}
                  {lead.top_hs_codes && (
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Top HS Codes:</span>
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 justify-end min-w-0">
                        {lead.top_hs_codes.split(',').map((code, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 rounded text-slate-800 font-semibold whitespace-nowrap transition-colors"
                            title={`Declared HS Code: ${code.trim()}`}
                          >
                            {code.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Executive Directors Card */}
                {lead.directors && (
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                        <span>Registered Directors &amp; Partners</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Customs Record</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.directors
                        .split(/[,;\n]/)
                        .map((d) => d.trim())
                        .filter(Boolean)
                        .map((director, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/90 rounded-lg text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span>{director}</span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APOLLO VERIFIED DECISION MAKERS */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Apollo Verified Decision Makers
                      </span>
                    </div>
                    {totalContacts > 0 && (
                      <span className="text-[11px] font-bold text-apollo bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {totalContacts} verified
                      </span>
                    )}
                  </div>

                  {!hasSearched && !isLoadingContacts ? (
                    <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-apollo border border-blue-200/60 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-apollo" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            Discover Executive Contacts
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Query Apollo's 15.5M executive database for verified CXOs, Directors, and Logistics procurement heads at this shipper.
                          </p>
                        </div>
                      </div>

                      {/* Recognized Preview */}
                      {(corporateDomain || directorName) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                          <span className="text-slate-400 font-medium">Recognized:</span>
                          {corporateDomain && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-blue-700 font-mono text-[10px] rounded border border-blue-200">
                              <Globe className="w-2.5 h-2.5 text-blue-500" />
                              @{corporateDomain}
                            </span>
                          )}
                          {directorName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-purple-700 text-[10px] rounded border border-purple-200 font-medium">
                              <UserCheck className="w-2.5 h-2.5 text-purple-500" />
                              {directorName}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleFetchDecisionMakers}
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-apollo hover:bg-apollo-hover text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Get Apollo Verified Decision Maker</span>
                        </button>

                        {onFindDecisionMakers && (
                          <button
                            type="button"
                            onClick={() =>
                              onFindDecisionMakers(
                                cleanedCompany || lead.company_name,
                                corporateDomain || undefined,
                                directorName || undefined
                              )
                            }
                            className="text-[11px] font-semibold text-apollo hover:underline cursor-pointer"
                          >
                            Open Directory →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : isLoadingContacts ? (
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center space-y-2 py-7 animate-fade-in shadow-2xs">
                      <Loader2 className="w-6 h-6 text-apollo animate-spin" />
                      <div className="text-xs font-bold text-slate-900">
                        Checking from Apollo…
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        Cross-referencing 15.5M executive database for verified CXOs, Directors, and Procurement decision makers...
                      </p>
                    </div>
                  ) : contacts.length > 0 ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="divide-y divide-slate-100 bg-slate-50/50 border border-slate-200/80 rounded-xl px-3 py-1 shadow-2xs">
                        {contacts.map((contact) => {
                          const badge = getSeniorityBadge(contact.seniority);
                          return (
                            <div
                              key={contact.id}
                              className="py-2.5 first:pt-1.5 last:pb-1.5 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-xs shrink-0">
                                  {getContactInitials(contact.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs truncate">
                                    {contact.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate" title={contact.title}>
                                    {contact.title}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {badge && (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                )}
                                {contact.email && (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="p-1 rounded text-emerald-600 bg-emerald-50 border border-emerald-200"
                                    title={`Email ${contact.email}`}
                                  >
                                    <Mail className="w-3 h-3" />
                                  </a>
                                )}
                                {contact.phone && (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="p-1 rounded text-blue-600 bg-blue-50 border border-blue-200"
                                    title={`Call ${contact.phone}`}
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {onFindDecisionMakers && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {totalContacts > contacts.length
                              ? `Top ${contacts.length} of ${totalContacts} indexed contacts`
                              : `${contacts.length} direct contact${contacts.length === 1 ? '' : 's'}`}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onFindDecisionMakers(
                                cleanedCompany || lead.company_name,
                                corporateDomain || undefined,
                                directorName || undefined
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-apollo hover:underline cursor-pointer"
                          >
                            <span>View all in Apollo People →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 py-1">
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        No contacts found under exact legal customs title. Search Apollo People directory using extracted attributes:
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => onFindDecisionMakers?.(cleanedCompany || lead.company_name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-apollo hover:text-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{cleanedCompany || lead.company_name}</span>
                        </button>

                        {corporateDomain && (
                          <button
                            type="button"
                            onClick={() =>
                              onFindDecisionMakers?.(cleanedCompany || lead.company_name, corporateDomain)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 transition-colors cursor-pointer"
                          >
                            <Globe className="w-3 h-3" />
                            <span>@{corporateDomain}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SALES FUNNEL & APPROACH */}
            {activeTab === 'funnel' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-apollo" />
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Sales Outreach & Funnel
                      </span>
                    </div>
                    <SalesStatusBadge status={getCachedApproachStatus('datamyne', lead.id, lead.company_name)} size="sm" />
                  </div>
                  <SalesApproachTimeline
                    entityType="datamyne"
                    entityId={lead.id}
                    companyName={lead.company_name}
                    onOpenLogModal={() => onLogApproach?.(lead)}
                    onOpenConvertModal={() => onConvertToActive?.(lead)}
                    showConvertButton={true}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Frosted Glass Sticky Bottom Action Dock */}
          <div className="p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-lg relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {onGenerateReport && (
                <button
                  type="button"
                  onClick={() => onGenerateReport(lead.company_name, lead.id, reportSource)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[40px] truncate"
                  title={`Generate Client Briefing Report for ${lead.company_name}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">Generate Client Report</span>
                  <span className="sr-only">Client Report &amp; Briefing</span>
                </button>
              )}

              {primaryCallNumber ? (
                <a
                  href={`tel:${primaryCallNumber}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors min-h-[40px] shrink-0"
                  title={`Call ${primaryCallNumber}`}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Call</span>
                </a>
              ) : null}

              {onLogApproach && (
                <button
                  type="button"
                  onClick={() => onLogApproach(lead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors min-h-[40px] shrink-0"
                  title="Log sales outreach note"
                >
                  <span>Log Approach</span>
                </button>
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
                    Quick Actions
                  </div>

                  {onFindDecisionMakers && (
                    <button
                      type="button"
                      onClick={() => {
                        onFindDecisionMakers(
                          cleanedCompany || lead.company_name,
                          corporateDomain || undefined,
                          directorName || undefined
                        );
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-apollo flex items-center gap-2"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-apollo" />
                      <span>Search in Apollo People</span>
                    </button>
                  )}

                  {lead.tax_id && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText(lead.tax_id, 'Tax ID (IEC)');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Tax ID (IEC)</span>
                    </button>
                  )}

                  {lead.address && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopyText(lead.address, 'Address');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Registered Address</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Full SOP Score Breakdown Modal */}
          {tieredLead && (
            <TierScoreBreakdownModal
              isOpen={isTierModalOpen}
              lead={tieredLead}
              onClose={() => setIsTierModalOpen(false)}
            />
          )}
        </aside>
      </div>
    </div>
  );
};
