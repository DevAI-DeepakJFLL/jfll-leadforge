import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Smartphone,
  Copy,
  MapPin,
  Calendar,
  DollarSign,
  PackageCheck,
  FileText,
  UserCheck,
  AlertCircle,
  Plane,
  Ship,
  PhoneOff,
  Globe,
  Mail,
  Sparkles,
  Loader2,
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
  className?: string;
}

export const DatamyneDetailDrawer: React.FC<DatamyneDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onFindDecisionMakers,
  onLogApproach,
  onConvertToActive,
  className = '',
}) => {
  const { showToast } = useToast();
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [contacts, setContacts] = useState<Lead[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Reset search state when a new lead is selected or drawer reopens
  useEffect(() => {
    if (contacts.length > 0) setContacts([]);
    if (totalContacts !== 0) setTotalContacts(0);
    if (isLoadingContacts) setIsLoadingContacts(false);
    if (hasSearched) setHasSearched(false);
  }, [lead?.id, isOpen]);

  const handleFetchDecisionMakers = () => {
    if (!lead?.company_name) return;
    setHasSearched(true);
    setIsLoadingContacts(true);
    const domain = extractDomainFromEmail(lead.email);
    const cleaned = cleanCustomsCompanyName(lead.company_name);

    fetchApolloPeopleLeads({
      company: cleaned || lead.company_name,
      domain: domain || undefined,
      limit: 10,
    })
      .then((res) => {
        setContacts(res.items);
        setTotalContacts(res.totalEstimate);
        setIsLoadingContacts(false);
      })
      .catch(() => {
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

  const initials = lead.company_name
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

  // Clean split for multiple email addresses
  const emailList = lead.email
    ? lead.email
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="datamyne-details-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <aside
          className={`w-screen max-w-full sm:max-w-lg lg:max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${className}`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-surface-border bg-slate-50/70 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-sm shrink-0">
                {initials || <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h2
                  id="datamyne-details-title"
                  className="text-base font-bold text-slate-900 truncate leading-snug"
                  title={lead.company_name}
                >
                  {lead.company_name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {tieredLead && (
                    <TierScoreBadge
                      status={tieredLead.segment_status}
                      score={tieredLead.total_score}
                      breakdown={tieredLead.score_breakdown}
                      onClick={() => setIsTierModalOpen(true)}
                    />
                  )}
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                      lead.role === 'Exporter'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : lead.role === 'Importer'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                    title={`Trading Role: ${lead.role}`}
                  >
                    {lead.role === 'Both (Exporter & Importer)' || lead.role === 'Both'
                      ? 'Both (Exp & Imp)'
                      : lead.role}
                  </span>

                  {lead.transport_mode && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
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
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Plane className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="text-indigo-300 font-normal">/</span>
                            <Ship className="w-3 h-3 text-indigo-600 shrink-0" />
                          </span>
                          <span>Multi-modal (Air & Ocean)</span>
                        </>
                      )}
                    </span>
                  )}

                  <DatamyneCategoryBadge category={lead.category} />

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${
                      isMissingContact
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {isMissingContact ? (
                      <PhoneOff className="w-3 h-3 text-slate-400 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                    {isMissingContact ? 'No Contact on File' : 'Contact on File'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close lead details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Notice Banner for Missing Contacts */}
            {isMissingContact && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-amber-900 text-xs">
                      No Direct Contact on File
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-relaxed">
                      Direct phone and email were not included on customs manifests for this account.
                      Refer to registered address, IEC, or directors below, or discover executive contacts in the Apollo Verified Decision Makers card below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Apollo Verified Decision Makers Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-apollo" />
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Apollo Verified Decision Makers
                  </span>
                </div>
                {totalContacts > 0 && (
                  <span className="text-[11px] font-semibold text-apollo bg-apollo/10 px-2 py-0.5 rounded-full border border-apollo/20">
                    {totalContacts} verified
                  </span>
                )}
              </div>

              {!hasSearched && !isLoadingContacts ? (
                <div className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-apollo" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        Discover Executive Contacts
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Query Apollo&apos;s 15.5M executive database for verified CXOs, Directors, and Procurement decision makers at this shipper.
                      </p>
                    </div>
                  </div>

                  {/* Attributes recognized preview */}
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
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-apollo hover:bg-apollo/90 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      title="Run Apollo verified decision maker query for this account"
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
                        className="text-[11px] font-semibold text-slate-500 hover:text-apollo hover:underline cursor-pointer"
                        title="Open Apollo People directory directly"
                      >
                        Open Directory →
                      </button>
                    )}
                  </div>
                </div>
              ) : isLoadingContacts ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Loader2 className="w-4 h-4 text-apollo animate-spin shrink-0" />
                    <span>Cross-referencing Apollo executive directory...</span>
                  </div>
                  <div className="space-y-2.5">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-lg animate-pulse"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200" />
                          <div className="space-y-1">
                            <div className="w-28 h-3 bg-slate-200 rounded" />
                            <div className="w-36 h-2.5 bg-slate-100 rounded" />
                          </div>
                        </div>
                        <div className="w-16 h-4 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : contacts.length > 0 ? (
                <div className="space-y-2">
                  <div className="divide-y divide-slate-100">
                    {contacts.map((contact) => {
                      const badge = getSeniorityBadge(contact.seniority);
                      return (
                        <div
                          key={contact.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-xs shrink-0">
                              {getContactInitials(contact.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-xs truncate">
                                {contact.name}
                              </div>
                              <div
                                className="text-[11px] text-slate-500 truncate"
                                title={contact.title}
                              >
                                {contact.title}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {badge && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                            )}
                            {contact.email && (
                              <span
                                className="p-1 rounded text-emerald-600 bg-emerald-50 border border-emerald-200"
                                title={`Verified Email: ${contact.email}`}
                              >
                                <Mail className="w-3 h-3" />
                              </span>
                            )}
                            {contact.phone && (
                              <span
                                className="p-1 rounded text-blue-600 bg-blue-50 border border-blue-200"
                                title={`Direct Phone: ${contact.phone}`}
                              >
                                <Phone className="w-3 h-3" />
                              </span>
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
                          ? `Showing top ${contacts.length} of ${totalContacts} indexed contacts`
                          : `${contacts.length} direct contact${contacts.length === 1 ? '' : 's'} available`}
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
                        <span>View all {totalContacts} in Apollo People →</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    No indexed contacts found under exact legal customs title. Search Apollo People directory using extracted corporate attributes:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFindDecisionMakers?.(cleanedCompany || lead.company_name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-apollo hover:text-white rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      title="Search by cleaned company name"
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
                        title="Search by corporate domain"
                      >
                        <Globe className="w-3 h-3" />
                        <span>@{corporateDomain}</span>
                      </button>
                    )}

                    {directorName && (
                      <button
                        type="button"
                        onClick={() =>
                          onFindDecisionMakers?.(
                            cleanedCompany || lead.company_name,
                            corporateDomain || undefined,
                            directorName
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white rounded-lg border border-purple-200 transition-colors cursor-pointer"
                        title="Search by director name"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>{directorName}</span>
                      </button>
                    )}
                  </div>

                  {onFindDecisionMakers && (
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
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
                        <span>Search Apollo People Directory →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Direct Outreach / Contact Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-apollo" />
                  Direct Channels
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {lead.contact_type}
                </span>
              </div>

              {/* Categorized Phone Numbers (Mobile Number vs Landline / Telephone Number) */}
              {contactNumbers.length > 0 ? (
                contactNumbers.map((num, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-t border-slate-200/60"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {num.type === 'mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="text-slate-600 font-medium text-[11px] sm:text-xs shrink-0">
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
                        aria-label={`Copy ${num.label} ${num.display}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between py-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600">Contact Number:</span>
                  </div>
                  <span className="text-slate-500 font-normal">Not available on manifest</span>
                </div>
              )}

              {/* Email Addresses */}
              {emailList.length > 0 ? (
                emailList.map((email, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-t border-slate-200/60"
                  >
                    <span className="text-slate-600 font-medium text-[11px] sm:text-xs">
                      Email Address:
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
                        aria-label={`Copy email ${email}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-between py-2 border-t border-slate-200/60">
                  <span className="text-slate-600">Email Address:</span>
                  <span className="text-slate-500 font-normal">Not available on manifest</span>
                </div>
              )}

              {/* Address */}
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
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                <PackageCheck className="w-4 h-4 text-apollo" />
                Logistics & Cargo Profile
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Category</span>
                  <strong className="text-slate-900 text-xs font-semibold block truncate">
                    {lead.category}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block mb-0.5">Subcategory</span>
                  <strong className="text-slate-900 text-xs font-semibold block truncate" title={lead.subcategory}>
                    {lead.subcategory}
                  </strong>
                </div>
              </div>

              <div className="divide-y divide-slate-100 border-t border-slate-100 text-xs pt-1">
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500">Transport Mode:</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 text-right">
                    {lead.transport_mode === 'Air' ? (
                      <>
                        <Plane className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Air Freight</span>
                      </>
                    ) : lead.transport_mode === 'Ocean' ? (
                      <>
                        <Ship className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>Ocean Freight</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center -space-x-1 shrink-0">
                          <Plane className="w-3.5 h-3.5 text-indigo-600" />
                          <Ship className="w-3.5 h-3.5 text-indigo-500" />
                        </span>
                        <span>Multi-modal (Air & Ocean)</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Trade Corridors:</span>
                  <span className="font-medium text-slate-900 text-right">{lead.trade_lanes || '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Latest Shipping Activity:</span>
                  <span className="font-mono text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {lead.latest_activity_date || '—'}
                  </span>
                </div>
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500">Customs Tax ID (IEC / PAN):</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {lead.tax_id || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Coordinator Outreach & Funnel Timeline Card */}
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

            {/* Trade Volume & Commodity HS Codes Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Trade Volume & Value
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <span className="text-[11px] text-slate-500 block">Total Customs Shipments</span>
                  <strong className="text-base font-bold text-slate-900 mt-0.5 block">
                    {lead.total_shipments.toLocaleString('en-US')} shipments
                  </strong>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg">
                  <span className="text-[11px] text-emerald-700 block">Traded Value (USD)</span>
                  <strong className="text-base font-bold text-emerald-800 mt-0.5 block">
                    ${lead.total_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Top HS Codes list */}
              {lead.top_hs_codes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    Top Declared HS Codes:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {lead.top_hs_codes.split(',').map((code, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-800"
                      >
                        {code.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Executive Directors Card (if available) */}
            {lead.directors && (
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-2">
                <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                  Registered Directors & Partners
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto max-h-36 no-scrollbar">
                  {lead.directors}
                </p>
              </div>
            )}
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
