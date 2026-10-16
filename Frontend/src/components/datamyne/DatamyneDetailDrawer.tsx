import React, { useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Copy,
  MapPin,
  Calendar,
  DollarSign,
  PackageCheck,
  FileText,
  UserCheck,
  Search,
  AlertCircle,
} from 'lucide-react';
import { DatamyneLead } from '@/types/datamyneLead';
import { DatamyneCategoryBadge } from './DatamyneCategoryBadge';
import { useToast } from '@/components/ui';

export interface DatamyneDetailDrawerProps {
  isOpen: boolean;
  lead: DatamyneLead | null;
  onClose: () => void;
  onSearchApollo?: (companyName: string) => void;
  className?: string;
}

export const DatamyneDetailDrawer: React.FC<DatamyneDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onSearchApollo,
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

  const isMissingContact = lead.dataset_type === 'missing';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="datamyne-dossier-title"
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
          className={`w-screen max-w-full sm:max-w-md lg:max-w-[500px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${className}`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-surface-border bg-slate-50/70 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-apollo/10 text-apollo border border-apollo/20 flex items-center justify-center font-bold text-sm shrink-0">
                {initials || <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h2
                  id="datamyne-dossier-title"
                  className="text-base font-bold text-slate-900 truncate leading-snug"
                  title={lead.company_name}
                >
                  {lead.company_name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      lead.role === 'Exporter'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : lead.role === 'Importer'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {lead.role}
                  </span>

                  <DatamyneCategoryBadge category={lead.category} />

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      isMissingContact
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isMissingContact ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                      }`}
                    />
                    {isMissingContact ? 'Missing Contacts' : 'Verified Contacts'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* Notice Banner for Missing Contacts */}
            {isMissingContact && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-amber-900 text-xs">
                    Contact Enrichment Target
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Direct phone and email were not included on customs manifests for this account.
                    Use the registered address, IEC, or directors to enrich contacts via Apollo.
                  </p>
                  {onSearchApollo && (
                    <button
                      type="button"
                      onClick={() => onSearchApollo(lead.company_name)}
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors cursor-pointer shadow-xs"
                    >
                      <Search className="w-3 h-3" />
                      <span>Search Decision Makers in Apollo</span>
                    </button>
                  )}
                </div>
              </div>
            )}

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

              {/* Phone */}
              <div className="flex items-center justify-between py-1.5 border-t border-slate-200/60">
                <span className="text-slate-600">Phone:</span>
                {lead.phone ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${lead.phone.split('/')[0].trim()}`}
                      className="font-mono text-apollo hover:underline"
                    >
                      {lead.phone}
                    </a>
                    <button
                      onClick={() => handleCopyText(lead.phone, 'Phone')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Copy phone"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Not available on manifest</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-1.5 border-t border-slate-200/60">
                <span className="text-slate-600">Email:</span>
                {lead.email ? (
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`mailto:${lead.email.split(',')[0].trim()}`}
                      className="text-apollo hover:underline truncate max-w-[200px]"
                      title={lead.email}
                    >
                      {lead.email}
                    </a>
                    <button
                      onClick={() => handleCopyText(lead.email, 'Email')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                      title="Copy email"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Not available on manifest</span>
                )}
              </div>

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
                    {lead.total_shipments.toLocaleString('en-US')} pkgs
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
        </aside>
      </div>
    </div>
  );
};
