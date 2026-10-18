import React, { useState, useEffect } from 'react';
import { ApolloLead, ApolloContact, TOP_APOLLO_CARGO_VERTICALS, toSafeExternalUrl } from '@/types/apolloLead';
import { fetchCompanyContacts } from '@/services/apolloService';
import {
  X,
  ExternalLink,
  Phone,
  Copy,
  Check,
  Building2,
  Users,
  DollarSign,
  Calendar,
  MapPin,
  Sparkles,
  Layers,
  Cpu,
  Briefcase,
  Share2,
  ArrowUpRight,
  Mail,
  Search,
  UserCheck,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { ApolloVerticalBadge } from './ApolloVerticalBadge';
import {
  getAvatarStyle,
  getCompanyInitials,
  getContactInitials,
  getSeniorityBadge,
  formatRevenue,
  parseTechnologies,
  parseJobFunctions,
  cleanLinkedinUrl,
} from '@/utils/apolloUtils';

export interface ApolloDetailDrawerProps {
  isOpen: boolean;
  lead: ApolloLead | null;
  onClose: () => void;
  onFindDecisionMakers?: (companyName: string, organizationId?: string) => void;
  className?: string;
}

export const ApolloDetailDrawer: React.FC<ApolloDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onFindDecisionMakers,
  className = '',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ApolloContact[]>([]);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [isLoadingContacts, setIsLoadingContacts] = useState<boolean>(false);
  const [contactsFilter, setContactsFilter] = useState<'all' | 'logistics' | 'email'>('all');
  const [contactsSearch, setContactsSearch] = useState<string>('');

  // Fetch company contacts from API with starter data fallback
  useEffect(() => {
    if (!lead?.organization_id) {
      setContacts([]);
      setTotalContacts(0);
      return;
    }

    let isMounted = true;
    setIsLoadingContacts(true);

    fetchCompanyContacts(lead.organization_id, {
      logisticsOnly: contactsFilter === 'logistics' ? true : undefined,
      hasEmailOnly: contactsFilter === 'email' ? true : undefined,
      search: contactsSearch.trim() || undefined,
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
  }, [lead?.organization_id, contactsFilter, contactsSearch]);

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

  if (!isOpen || !lead) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Find cargo vertical logistics fit
  const verticalMeta = TOP_APOLLO_CARGO_VERTICALS.find(
    (v) => v.id.toLowerCase() === lead.industry.toLowerCase()
  );

  const technologies = parseTechnologies(lead.technologies_raw);
  const jobFunctions = parseJobFunctions(lead.job_functions_json);
  const linkedinUrl = cleanLinkedinUrl(lead.linkedin_url);

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-surface-border bg-slate-50/70 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-12 h-12 rounded-xl ${getAvatarStyle(lead.organization_name).bg} ${getAvatarStyle(lead.organization_name).text} border ${getAvatarStyle(lead.organization_name).border} font-bold text-base flex items-center justify-center shrink-0 uppercase shadow-2xs`}>
                  {getCompanyInitials(lead.organization_name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {lead.organization_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {lead.domain}
                    </span>
                    <ApolloVerticalBadge industry={lead.industry} showMode={true} />
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
                aria-label="Close organization dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
              <a
                href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-apollo text-white rounded-lg text-xs font-semibold hover:bg-apollo-hover transition-colors shadow-2xs min-h-[36px]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call {lead.phone}</span>
              </a>

              <button
                onClick={() => handleCopy(lead.phone, 'phone')}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs min-h-[36px]"
              >
                {copiedField === 'phone' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Copied Phone</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Phone</span>
                  </>
                )}
              </button>

              {toSafeExternalUrl(lead.website_url) && (
                <a
                  href={toSafeExternalUrl(lead.website_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs min-h-[36px]"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Website</span>
                </a>
              )}

              {toSafeExternalUrl(linkedinUrl) && (
                <a
                  href={toSafeExternalUrl(linkedinUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-blue-200 text-[#0077b5] rounded-lg text-xs font-medium hover:bg-blue-50/50 transition-colors shadow-2xs min-h-[36px]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>LinkedIn</span>
                </a>
              )}

              {onFindDecisionMakers && (
                <button
                  onClick={() => onFindDecisionMakers(lead.organization_name, lead.organization_id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-apollo rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors shadow-2xs min-h-[36px]"
                  title={`Find decision-makers at ${lead.organization_name} in People tab`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Find Decision-Makers</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dossier Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700">
            {/* 1. Scale & Financial Health Cards */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Commercial Scale & Footprint</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <DollarSign className="w-3 h-3" />
                    <span>Annual Revenue</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono text-xs sm:text-sm">
                    {formatRevenue(lead.revenue_usd)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>Headcount</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono text-xs sm:text-sm">
                    {lead.employee_count ? `${lead.employee_count.toLocaleString()} staff` : '—'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Established</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 font-mono text-xs sm:text-sm">
                    {lead.founded_year || '—'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>Country</span>
                  </div>
                  <div className="font-bold text-slate-900 mt-1 truncate text-xs sm:text-sm">
                    {lead.hq_country || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Key Decision-Makers & Logistics Contacts Section */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-apollo flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Key Decision-Makers & Contacts
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-apollo border border-blue-200">
                        {totalContacts}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Direct logistics, supply chain, and procurement contacts at {lead.organization_name}
                    </p>
                  </div>
                </div>

                {onFindDecisionMakers && (
                  <button
                    onClick={() => onFindDecisionMakers(lead.organization_name, lead.organization_id)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-apollo hover:text-apollo-hover hover:underline transition-colors shrink-0"
                    title={`Open all contacts in People tab`}
                  >
                    <span>View in People directory</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactsSearch}
                    onChange={(e) => setContactsSearch(e.target.value)}
                    placeholder="Search name, job title, email..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-apollo focus:border-apollo"
                  />
                  {contactsSearch && (
                    <button
                      onClick={() => setContactsSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0 overflow-x-auto">
                  <button
                    onClick={() => setContactsFilter('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      contactsFilter === 'all'
                        ? 'bg-apollo text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setContactsFilter('logistics')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
                      contactsFilter === 'logistics'
                        ? 'bg-apollo text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Logistics Roles</span>
                  </button>
                  <button
                    onClick={() => setContactsFilter('email')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 ${
                      contactsFilter === 'email'
                        ? 'bg-apollo text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>With Email</span>
                  </button>
                </div>
              </div>

              {/* Contacts Cards List */}
              {isLoadingContacts ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500 bg-white rounded-xl border border-slate-200/60">
                  <Loader2 className="w-5 h-5 animate-spin text-apollo" />
                  <span className="text-xs font-medium">Loading verified contacts...</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-6 px-4 text-center bg-white rounded-xl border border-slate-200/60 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">
                    No contacts found matching criteria
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Try switching filters to "All" or query the global People directory for additional specialists.
                  </p>
                  {contactsFilter !== 'all' && (
                    <button
                      onClick={() => {
                        setContactsFilter('all');
                        setContactsSearch('');
                      }}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                    >
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {contacts.map((contact) => {
                    const badge = getSeniorityBadge(contact.seniority);
                    const cleanEmail = contact.email?.trim();
                    const linkedinUrl = toSafeExternalUrl(contact.linkedin_url);
                    return (
                      <div
                        key={contact.person_id}
                        className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {getContactInitials(contact.person_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {contact.person_name}
                                </span>
                                {badge && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badge.bg} shrink-0`}
                                  >
                                    {badge.label}
                                  </span>
                                )}
                                {contact.is_logistics_role && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                    Logistics Fit
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 font-medium line-clamp-1">
                                {contact.job_title}
                              </div>
                            </div>
                          </div>

                          {linkedinUrl && (
                            <a
                              href={linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0077b5] hover:bg-blue-50 transition-colors shrink-0"
                              title="Open LinkedIn Profile"
                              aria-label={`View ${contact.person_name} on LinkedIn`}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Contact Channels: Direct Email & Location */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
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
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                                title="Copy email address"
                                aria-label="Copy email"
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
                              ) : (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                  Confidence {Math.round((contact.email_confidence ?? 0.7) * 100)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>Direct email undisclosed</span>
                            </span>
                          )}

                          {(contact.contact_city || contact.contact_country) && (
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1 shrink-0">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>
                                {[contact.contact_city, contact.contact_state, contact.contact_country]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer navigation if more records exist */}
              {totalContacts > contacts.length && onFindDecisionMakers && (
                <div className="pt-2 text-center border-t border-slate-200/60">
                  <button
                    onClick={() => onFindDecisionMakers(lead.organization_name)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-apollo text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    <span>{`View all ${totalContacts} contacts in People tab`}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. Logistics & Freight Fit */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center space-x-2 text-apollo font-semibold text-xs mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Jet Freight Logistics Alignment</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                As a commercial entity in <strong className="text-slate-900 capitalize">{lead.industry}</strong>, this account matches Jet Freight's core trade lanes for{' '}
                <strong className="text-apollo">{verticalMeta ? verticalMeta.cargoMode : 'Air & Ocean Freight Forwarding'}</strong>.
              </p>
              {lead.hq_city && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Headquartered in <strong className="text-slate-800">{lead.hq_city}, {lead.hq_state || ''} {lead.hq_country || ''}</strong>. Suitable for origin drayage, airport CFS transfer, and customs brokerage.
                </div>
              )}
            </div>

            {/* 3. Product Specialties & Trade Keywords */}
            {(lead.specialties || lead.keywords) && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Specialties & Commodities</span>
                </h3>
                {lead.specialties && (
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-1">Product Capabilities:</div>
                    <div className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                      {lead.specialties}
                    </div>
                  </div>
                )}
                {lead.keywords && (
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-1">Search Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {lead.keywords.split(',').map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Detected ERP, WMS, and Tech Stack */}
            {technologies.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>Detected Technology Stack ({technologies.length})</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-mono capitalize"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Departmental Headcount Breakdown */}
            {jobFunctions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>Departmental Breakdown</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {jobFunctions.map((fn, idx) => (
                    <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 capitalize truncate">{fn.name}</div>
                      <div className="font-semibold text-slate-800 font-mono text-xs">
                        {fn.count.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Entity Master Identifiers */}
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex flex-col space-y-1 font-mono">
              <div>Apollo Entity ID: {lead.organization_id}</div>
              <div>Domain Key: {lead.domain}</div>
              <div>Postal Code: {lead.hq_postal_code || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
