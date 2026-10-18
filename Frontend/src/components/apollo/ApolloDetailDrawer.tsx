import React, { useState, useEffect } from 'react';
import { ApolloLead, TOP_APOLLO_CARGO_VERTICALS, toSafeExternalUrl } from '@/types/apolloLead';
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
} from 'lucide-react';
import { ApolloVerticalBadge } from './ApolloVerticalBadge';
import { getAvatarStyle, getCompanyInitials } from './ApolloTable';

export interface ApolloDetailDrawerProps {
  isOpen: boolean;
  lead: ApolloLead | null;
  onClose: () => void;
  onFindDecisionMakers?: (companyName: string) => void;
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

  const formatRevenue = (rev?: number | null) => {
    if (!rev || rev === 0) return 'Not disclosed';
    if (rev >= 1000000000) return `$${(rev / 1000000000).toFixed(2)} Billion`;
    if (rev >= 1000000) return `$${(rev / 1000000).toFixed(2)} Million`;
    if (rev >= 1000) return `$${(rev / 1000).toFixed(0)} Thousand`;
    return `$${rev.toLocaleString()}`;
  };

  // Find cargo vertical logistics fit
  const verticalMeta = TOP_APOLLO_CARGO_VERTICALS.find(
    (v) => v.id.toLowerCase() === lead.industry.toLowerCase()
  );

  // Parse technologies from string like "['salesforce', 'sap']"
  const parseTechnologies = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const cleaned = raw.replace(/'/g, '"');
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr)) {
        return arr.slice(0, 20).map((t) => t.replace(/_/g, ' '));
      }
    } catch {
      return raw
        .replace(/[\[\]']/g, '')
        .split(',')
        .map((t) => t.trim().replace(/_/g, ' '))
        .filter(Boolean)
        .slice(0, 20);
    }
    return [];
  };

  // Parse job functions from string like "{'engineering': 21515, 'operations': 1929}"
  const parseJobFunctions = (raw?: string | null): { name: string; count: number }[] => {
    if (!raw) return [];
    try {
      const cleaned = raw.replace(/'/g, '"');
      const obj = JSON.parse(cleaned);
      return Object.entries(obj)
        .map(([k, v]) => ({ name: k.replace(/_/g, ' '), count: Number(v) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    } catch {
      return [];
    }
  };

  // Parse LinkedIn URL from array string like "['http://www.linkedin.com/company/1483']"
  const cleanLinkedinUrl = (raw?: string | null): string | null => {
    if (!raw) return null;
    return raw.replace(/[\[\]']/g, '').trim() || null;
  };

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
                  onClick={() => onFindDecisionMakers(lead.organization_name)}
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
            {/* Account Scope & Decision-Maker Bridge Callout */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center space-x-1.5 text-slate-900 font-semibold text-xs">
                  <Users className="w-4 h-4 text-apollo shrink-0" />
                  <span>{`Looking for Decision-Makers at ${lead.organization_name}?`}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  This Apollo record contains company-level firmographics. Query the People directory to source Logistics Heads, Supply Chain VPs, and freight buyers.
                </p>
              </div>
              {onFindDecisionMakers && (
                <button
                  onClick={() => onFindDecisionMakers(lead.organization_name)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-apollo text-white hover:bg-apollo-hover rounded-lg text-xs font-medium shrink-0 shadow-2xs transition-colors min-h-[32px]"
                >
                  <span>Search People Tab</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

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

            {/* 2. Logistics & Freight Fit */}
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
