import React, { useState, useEffect, useRef } from 'react';
import { ApolloLead, ApolloContact, TOP_APOLLO_CARGO_VERTICALS, toSafeExternalUrl } from '@/types/apolloLead';
import { fetchCompanyContacts } from '@/services/apolloService';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDebounce } from '@/hooks/useDebounce';
import {
  X,
  ExternalLink,
  Phone,
  Copy,
  Check,
  Users,
  MapPin,
  Sparkles,
  Layers,
  Briefcase,
  Share2,
  ArrowUpRight,
  Mail,
  Search,
  UserCheck,
  Loader2,
  ShieldCheck,
  ClipboardList,
  FileText,
  MoreHorizontal,
  Globe,
} from 'lucide-react';
import { ApolloVerticalBadge } from './ApolloVerticalBadge';
import {
  getAvatarStyle,
  getCompanyInitials,
  getContactInitials,
  getSeniorityBadge,
  formatRevenue,
  parseJobFunctions,
  cleanLinkedinUrl,
} from '@/utils/apolloUtils';

export interface ApolloDetailDrawerProps {
  isOpen: boolean;
  lead: ApolloLead | null;
  onClose: () => void;
  onFindDecisionMakers?: (companyName: string, organizationId?: string) => void;
  onAssignToTracker?: (lead: ApolloLead) => void;
  onGenerateReport?: (companyName: string, id?: string, source?: string) => void;
  className?: string;
}

export const ApolloDetailDrawer: React.FC<ApolloDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onFindDecisionMakers,
  onAssignToTracker,
  onGenerateReport,
  className = '',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [contactsFilter, setContactsFilter] = useState<'all' | 'logistics' | 'email'>('all');
  const [contactsSearch, setContactsSearch] = useState<string>('');
  const debouncedContactsSearch = useDebounce(contactsSearch, 250);
  const [activeTab, setActiveTab] = useState<'contacts' | 'cargo' | 'organization'>('contacts');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Fetch company contacts from API with starter data fallback (debounced to avoid network churn on keystrokes)
  useEffect(() => {
    if (!lead?.organization_id) {
      setContacts([]);
      setTotalContacts(0);
      return;
    }

    let isMounted = true;
    setIsLoadingContacts(true);

    fetchCompanyContacts(lead.organization_id, lead.organization_name, {
      logisticsOnly: contactsFilter === 'logistics' ? true : undefined,
      hasEmailOnly: contactsFilter === 'email' ? true : undefined,
      search: debouncedContactsSearch.trim() || undefined,
      limit: 20,
    })
      .then((res) => {
        if (isMounted) {
          setContacts(res.items);
          setTotalContacts(res.totalRecords);
          setIsLoadingContacts(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingContacts(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lead?.organization_id, lead?.organization_name, contactsFilter, debouncedContactsSearch]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow === 'hidden' ? 'auto' : (document.body.style.overflow || 'auto');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow === 'hidden' ? 'auto' : originalOverflow;
      };
    }
  }, [isOpen]);

  // Click outside and Escape listener to close More menu
  useClickOutside(moreMenuRef, () => setIsMoreMenuOpen(false), isMoreMenuOpen);

  // Reset tab and menu when lead changes
  useEffect(() => {
    if (lead) {
      setActiveTab('contacts');
      setIsMoreMenuOpen(false);
    }
  }, [lead?.organization_id]);

  if (!isOpen || !lead) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Find cargo vertical logistics fit
  const verticalMeta = lead.industry
    ? TOP_APOLLO_CARGO_VERTICALS.find(
        (v) => v.id.toLowerCase() === lead.industry.toLowerCase()
      )
    : undefined;

  const jobFunctions = parseJobFunctions(lead.job_functions_json);
  const linkedinUrl = cleanLinkedinUrl(lead.linkedin_url);
  const websiteUrl = toSafeExternalUrl(lead.website_url);
  const safeLinkedinUrl = toSafeExternalUrl(linkedinUrl);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`} role="dialog" aria-modal="true" aria-labelledby="apollo-drawer-title">
      {/* Dimmed Backdrop with Light Dismiss */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-2xl lg:max-w-3xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-12 h-12 rounded-xl ${getAvatarStyle(lead.organization_name).bg} ${getAvatarStyle(lead.organization_name).text} border ${getAvatarStyle(lead.organization_name).border} font-bold text-base flex items-center justify-center shrink-0 uppercase shadow-2xs`}>
                  {getCompanyInitials(lead.organization_name)}
                </div>
                <div className="min-w-0">
                  <h2 id="apollo-drawer-title" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {lead.organization_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {lead.domain}
                    </span>
                    <ApolloVerticalBadge industry={lead.industry} showMode={true} />
                    {lead.hq_country && (
                      <span className="text-[11px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                        {lead.hq_country}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close organization profile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bento Key Metric Strip */}
            <div className="grid grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-slate-200/70">
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Revenue</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 truncate">
                  {formatRevenue(lead.revenue_usd)}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Staff</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5 truncate">
                  {lead.employee_count ? `${lead.employee_count.toLocaleString()} staff` : '—'}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Founded</div>
                <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                  {lead.founded_year || '—'}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5 truncate" title={lead.hq_city || lead.hq_country || ''}>
                  {lead.hq_city || lead.hq_country || '—'}
                </div>
              </div>
            </div>

            {/* Apple HIG Segmented Navigation */}
            <div className="mt-3.5 bg-slate-200/70 p-1 rounded-xl flex items-center gap-1" role="tablist" aria-label="Apollo profile navigation">
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
                <span>Contacts & Fit</span>
                {totalContacts > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-apollo font-bold">
                    {totalContacts}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'cargo'}
                onClick={() => setActiveTab('cargo')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                  activeTab === 'cargo'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Logistics & Cargo
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'organization'}
                onClick={() => setActiveTab('organization')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                  activeTab === 'organization'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Department Scale
              </button>
            </div>
          </div>

          {/* Profile Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700">
            {/* TAB 1: CONTACTS & KEY FIT */}
            {activeTab === 'contacts' && (
              <div className="space-y-4">
                {/* Compact Jet Freight Alignment Banner */}
                <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-3.5 rounded-xl border border-blue-200/70 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs leading-tight">
                      Jet Freight Logistics Alignment: <span className="text-apollo">{verticalMeta ? verticalMeta.cargoMode : 'Air & Ocean Freight'}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Matches core consolidation lanes for <strong className="capitalize">{lead.industry}</strong> accounts from airport CFS & ocean terminals.
                    </p>
                  </div>
                </div>

                {lead.specialties && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>Specialties & Commodities</span>
                    </div>
                    <div className="text-xs text-slate-800 leading-relaxed">{lead.specialties}</div>
                  </div>
                )}

                {/* Contacts Search & Filter Toolbar */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-apollo" />
                      <span>Key Decision-Makers & Contacts ({totalContacts})</span>
                    </div>

                    {onFindDecisionMakers && (
                      <button
                        onClick={() => onFindDecisionMakers(lead.organization_name, lead.organization_id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-apollo hover:underline"
                        title="Open full roster in Apollo People directory"
                      >
                        <span>View in People directory</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={contactsSearch}
                        onChange={(e) => setContactsSearch(e.target.value)}
                        placeholder="Search name, job title, email..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-apollo focus:border-apollo"
                      />
                      {contactsSearch && (
                        <button
                          onClick={() => setContactsSearch('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          title="Clear search"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setContactsFilter('all')}
                        className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                          contactsFilter === 'all'
                            ? 'bg-apollo text-white shadow-2xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setContactsFilter('logistics')}
                        className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1 ${
                          contactsFilter === 'logistics'
                            ? 'bg-apollo text-white shadow-2xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>Logistics</span>
                      </button>
                      <button
                        onClick={() => setContactsFilter('email')}
                        className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors ${
                          contactsFilter === 'email'
                            ? 'bg-apollo text-white shadow-2xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Email
                      </button>
                    </div>
                  </div>

                  {/* Contacts List */}
                  {isLoadingContacts ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500 bg-slate-50/60 rounded-xl border border-slate-200/80">
                      <Loader2 className="w-5 h-5 animate-spin text-apollo" />
                      <span className="text-xs font-medium">Querying verified contacts...</span>
                    </div>
                  ) : contacts.length === 0 ? (
                    <div className="py-6 px-4 text-center bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2">
                      <Users className="w-7 h-7 text-slate-300 mx-auto" />
                      <div className="text-xs font-semibold text-slate-700">
                        No contacts found matching criteria
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Try resetting filters or querying the global People directory for additional specialists.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((contact) => {
                        const badge = getSeniorityBadge(contact.seniority);
                        const cleanEmail = contact.email?.trim();
                        const contactLinkedin = toSafeExternalUrl(contact.linkedin_url);

                        return (
                          <div
                            key={contact.person_id}
                            className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:border-blue-300 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                  {getContactInitials(contact.person_name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                      {contact.person_name}
                                    </span>
                                    {badge && (
                                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badge.bg} shrink-0`}>
                                        {badge.label}
                                      </span>
                                    )}
                                    {contact.is_logistics_role && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                        Logistics Fit
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-600 font-medium line-clamp-1 mt-0.5">
                                    {contact.job_title}
                                  </div>
                                </div>
                              </div>

                              {contactLinkedin && (
                                <a
                                  href={contactLinkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-400 hover:text-[#0077b5] hover:bg-blue-50 rounded transition-colors shrink-0"
                                  title="View LinkedIn Profile"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            {/* Direct Communication Channels */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                              {cleanEmail ? (
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <a
                                    href={`mailto:${cleanEmail}`}
                                    className="inline-flex items-center space-x-1 text-apollo hover:underline font-mono text-xs truncate"
                                    title={`Email ${contact.person_name}`}
                                  >
                                    <Mail className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{cleanEmail}</span>
                                  </a>
                                  <button
                                    onClick={() => handleCopy(cleanEmail, `email-${contact.person_id}`)}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                                    title="Copy email address"
                                  >
                                    {copiedField === `email-${contact.person_id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  {contact.email_status === 'Verified' ? (
                                    <span className="inline-flex items-center space-x-0.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium shrink-0">
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                      <span>Verified</span>
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No direct email on file</span>
                              )}

                              {(contact.contact_city || contact.contact_country) && (
                                <div className="text-slate-500 flex items-center space-x-1 shrink-0">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                  <span>
                                    {[contact.contact_city, contact.contact_country].filter(Boolean).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {totalContacts > contacts.length && onFindDecisionMakers && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => onFindDecisionMakers(lead.organization_name, lead.organization_id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-apollo border border-blue-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                      >
                        <span>{`View all ${totalContacts} contacts in People directory`}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: LOGISTICS & CARGO PROFILE */}
            {activeTab === 'cargo' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center space-x-2 text-apollo font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    <span>Jet Freight Logistics Capability Match</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Account operates within <strong className="text-slate-900 capitalize">{lead.industry}</strong>, matching Jet Freight's specialized trade lanes for{' '}
                    <strong className="text-apollo">{verticalMeta ? verticalMeta.cargoMode : 'Air & Ocean Freight Forwarding'}</strong>.
                  </p>
                  {lead.hq_city && (
                    <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      Headquartered in <strong className="text-slate-800">{lead.hq_city}, {lead.hq_state || ''} {lead.hq_country || ''}</strong>. Suitable for origin drayage, airport CFS transfer, and customs brokerage.
                    </div>
                  )}
                </div>

                {lead.specialties && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Product Capabilities & Commodities</span>
                    </h3>
                    <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                      {lead.specialties}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ORGANIZATION & DEPARTMENT SCALE */}
            {activeTab === 'organization' && (
              <div className="space-y-4">
                {jobFunctions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>Departmental Breakdown</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {jobFunctions.map((fn, idx) => (
                        <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          <div className="text-[11px] text-slate-500 capitalize truncate font-medium">{fn.name}</div>
                          <div className="font-bold text-slate-900 font-mono text-xs mt-0.5">
                            {(fn.count ?? 0).toLocaleString()} staff
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1 font-mono">
                  <div className="font-sans font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Entity Record Keys
                  </div>
                  <div>Domain Key: <span className="text-slate-800 font-semibold">{lead.domain}</span></div>
                  <div>Postal Code: <span className="text-slate-800">{lead.hq_postal_code || 'N/A'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Frosted Glass Sticky Bottom Action Dock */}
          <div className="p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-lg relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-apollo text-white rounded-lg text-xs font-semibold hover:bg-apollo-hover transition-colors shadow-2xs min-h-[40px] truncate"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Call {lead.phone}</span>
                </a>
              ) : (
                <button
                  onClick={() => handleCopy(lead.domain, 'domain')}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors min-h-[40px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Domain</span>
                </button>
              )}

              {onFindDecisionMakers && (
                <button
                  type="button"
                  onClick={() => onFindDecisionMakers(lead.organization_name, lead.organization_id)}
                  className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 border border-blue-200 text-apollo rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors shadow-2xs min-h-[40px] truncate"
                  title={`Find decision-makers at ${lead.organization_name}`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Find Decision-Makers</span>
                </button>
              )}

              {onAssignToTracker && (
                <button
                  type="button"
                  onClick={() => onAssignToTracker(lead)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs min-h-[40px] shrink-0"
                  title={`Assign ${lead.organization_name} to freight sales coordinator`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Assign & Track</span>
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
                    Account Actions
                  </div>

                  {onGenerateReport && (
                    <button
                      type="button"
                      onClick={() => {
                        onGenerateReport(lead.organization_name, lead.organization_id, 'apollo');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-apollo flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Generate Client Report</span>
                    </button>
                  )}

                  {onAssignToTracker && (
                    <button
                      type="button"
                      onClick={() => {
                        onAssignToTracker(lead);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-800 flex items-center gap-2"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-amber-500" />
                      <span>Assign to Sales Rep</span>
                    </button>
                  )}

                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Visit Website</span>
                      <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                    </a>
                  )}

                  {safeLinkedinUrl && (
                    <a
                      href={safeLinkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#0077b5]" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                    </a>
                  )}

                  {lead.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(lead.phone, 'phone');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 border-t border-slate-100"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Phone Number</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
