import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  Building2,
  Mail,
  Copy,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Eye,
  AlertCircle,
  RotateCcw,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { JfllCustomer, JfllCustomerSortField } from '@/types/jfllCustomer';
import { JfllCustomerGroupBadge } from './JfllCustomerGroupBadge';
import { useToast } from '@/components/ui';
import { isValidPhoneNumber } from '@/utils/phoneUtils';
import { formatIndianCurrency } from '@/services/jfllCustomerService';
import { SalesStatusBadge } from '@/components/approach';
import {
  APPROACH_STATUS_CHANGED_EVENT,
  getCachedApproachStatus,
} from '@/services/approachLogService';

export interface JfllCustomerTableProps {
  customers: JfllCustomer[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onCustomerClick: (customer: JfllCustomer) => void;
  onLogApproach?: (customer: JfllCustomer) => void;
  onConvertToActive?: (customer: JfllCustomer) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalFormatted?: string;
  sortBy?: JfllCustomerSortField;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: JfllCustomerSortField) => void;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * High-definition Indian Flag SVG icon (Ashoka Chakra on white band)
 */
export const IndiaFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-[2px] overflow-hidden border border-slate-300 shadow-2xs leading-none ${className}`}
    title="India (+91)"
    aria-label="India (+91)"
  >
    <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
      <path fill="#f93" d="M0 0h640v160H0z" />
      <path fill="#fff" d="M0 160h640v160H0z" />
      <path fill="#128807" d="M0 320h640v160H0z" />
      <g transform="matrix(3.2 0 0 3.2 320 240)">
        <circle r="20" fill="#008" />
        <circle r="17.5" fill="#fff" />
        <circle r="3.5" fill="#008" />
        <g id="d">
          <g id="c">
            <g id="b">
              <g id="a">
                <circle r=".875" cy="-17.5" fill="#008" />
                <path fill="#008" d="M0-17.5L.6-3.5 0 0l-.6-3.5z" />
              </g>
              <use href="#a" transform="rotate(15)" />
            </g>
            <use href="#b" transform="rotate(30)" />
          </g>
          <use href="#c" transform="rotate(60)" />
        </g>
        <use href="#d" transform="rotate(120)" />
        <use href="#d" transform="rotate(240)" />
      </g>
    </svg>
  </span>
);

/**
 * Normalizes phone numbers by stripping +91 prefix for pairing with the Indian flag icon.
 * Returns null if the phone is missing, a placeholder (like "-"), or invalid.
 */
export function formatPhoneNumber(phone: string | null | undefined): { number: string; raw: string } | null {
  if (!isValidPhoneNumber(phone)) return null;
  const raw = phone!.trim();
  const digits = raw.replace(/\D/g, '');
  // Strip leading minus if exported from Excel as negative number (e.g. -9810926644)
  let cleaned = raw.replace(/^-/, '');
  // Strip leading +91-, +91, 91-, or +
  cleaned = cleaned.replace(/^(\+91[-\s]?|91[-\s]?|\+)/, '').trim();
  return {
    number: cleaned || digits,
    raw: cleaned ? `+91-${cleaned}` : raw,
  };
}

export const JfllCustomerTable: React.FC<JfllCustomerTableProps> = ({
  customers,
  rowSelection,
  onRowSelectionChange,
  onCustomerClick,
  onLogApproach,
  onConvertToActive,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalFormatted,
  sortBy = 'fullName',
  sortOrder = 'asc',
  onSortChange,
  onPageChange,
  onClearFilters,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  className = '',
}) => {
  const { showToast } = useToast();
  const [, setUpdateTrigger] = React.useState(0);

  React.useEffect(() => {
    const handler = () => setUpdateTrigger((v) => v + 1);
    window.addEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(APPROACH_STATUS_CHANGED_EVENT, handler);
  }, []);

  const handleToggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRowSelectionChange((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  const renderSortHeader = (
    field: JfllCustomerSortField,
    label: string,
    widthClass: string,
    customTooltip?: string
  ) => {
    const isSorted = sortBy === field;
    const isAsc = isSorted && sortOrder === 'asc';
    return (
      <th
        scope="col"
        aria-sort={isSorted ? (isAsc ? 'ascending' : 'descending') : 'none'}
        className={`py-2.5 ${widthClass} select-none transition-colors ${
          isSorted ? 'bg-blue-50/70 text-apollo-900' : 'hover:bg-slate-100/80'
        }`}
      >
        <button
          type="button"
          onClick={() => onSortChange?.(field)}
          className="w-full flex items-center justify-between gap-1.5 text-left font-semibold text-[11px] uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-apollo rounded py-0.5 cursor-pointer group/btn"
          title={
            customTooltip ||
            (isSorted
              ? `Sorted ${isAsc ? 'A to Z / lowest first' : 'Z to A / highest first'} — Click to reverse order`
              : `Sort by ${label}`)
          }
        >
          <span
            className={`truncate transition-colors ${
              isSorted
                ? 'text-apollo-700 font-bold'
                : 'text-slate-600 group-hover/btn:text-slate-900'
            }`}
          >
            {label}
          </span>
          <span
            className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-md transition-all ${
              isSorted
                ? 'bg-apollo text-white shadow-2xs'
                : 'text-slate-400 group-hover/btn:text-slate-700 group-hover/btn:bg-slate-200/70'
            }`}
            aria-hidden="true"
          >
            {isSorted ? (
              isAsc ? (
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              )
            ) : (
              <ChevronsUpDown className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </span>
        </button>
      </th>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-3 w-10 text-center"><span className="sr-only">Select</span></th>
                <th scope="col" className="py-2.5 px-4 min-w-[260px]">Company Name</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[150px]">Customer Group</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[95px]">Status</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[120px]">Credit Status</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[125px]">Recent Revenue</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[150px]">Contact Person</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[155px]">Phone Number</th>
                <th scope="col" className="py-2.5 px-3.5 min-w-[190px]">Email</th>
                <th scope="col" className="py-2.5 px-4 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: pageSize || 10 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-3.5 px-3 text-center"><div className="w-4 h-4 bg-slate-200 rounded mx-auto" /></td>
                  <td className="py-3.5 px-4"><div className="w-48 h-3.5 bg-slate-200 rounded mb-1.5" /><div className="w-24 h-2.5 bg-slate-100 rounded" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-24 h-5 bg-slate-150 rounded-full" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-14 h-4 bg-emerald-100/60 rounded-full" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-20 h-4 bg-slate-150 rounded" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-16 h-4 bg-slate-150 rounded" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-28 h-3 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-28 h-3 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-3.5"><div className="w-36 h-3 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4 text-center"><div className="w-12 h-6 bg-slate-100 rounded mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`p-8 text-center bg-white rounded-xl border border-red-200 max-w-md mx-auto my-12 shadow-sm ${className}`}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Failed to load JFLL customers</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          {error?.message || 'A network error occurred while querying the customer database.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </button>
        )}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          No JFLL Customers match your filters
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          Try loosening your search keywords or resetting your filters.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-apollo hover:bg-apollo-600 rounded-md transition-colors shadow-2xs"
          >
            Reset All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col ${className}`}
    >
      {/* Table Container */}
      <div className="overflow-x-auto min-w-0">
        <table className="w-full min-w-[1080px] text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <th scope="col" className="py-2.5 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              {renderSortHeader('fullName', 'Company Name', 'px-4 min-w-[260px]', 'Sort alphabetically by company name')}
              {renderSortHeader('customerGroup', 'Customer Group', 'px-3.5 min-w-[150px]', 'Sort by customer category')}
              {renderSortHeader('status', 'Status', 'px-3.5 min-w-[95px]', 'Sort by active / inactive status')}
              <th scope="col" className="py-2.5 px-3.5 min-w-[130px]">Approach Status</th>
              {renderSortHeader('creditStatus', 'Credit Status', 'px-3.5 min-w-[120px]', 'Sort by credit approval')}
              {renderSortHeader('businessLast3m', 'Recent Revenue', 'px-3.5 min-w-[125px]', 'Sort by 90-day business volume (highest first)')}
              {renderSortHeader('contactPersonName', 'Contact Person', 'px-3.5 min-w-[150px]', 'Sort by named contact person')}
              <th scope="col" className="py-2.5 px-3.5 min-w-[155px]">Phone Number</th>
              <th scope="col" className="py-2.5 px-3.5 min-w-[190px]">Email</th>
              <th scope="col" className="py-2.5 px-4 min-w-[160px] text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((c) => {
              const isSelected = !!rowSelection[c.id];
              const initials = c.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              const phoneData = formatPhoneNumber(c.mobileNumber);

              return (
                <tr
                  key={c.id}
                  onClick={() => onCustomerClick(c)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/35 hover:bg-blue-50/50' : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3 px-3 text-center align-middle"
                    onClick={(e) => handleToggleRow(c.id, e)}
                  >
                    <div className="flex items-center justify-center min-h-[36px] min-w-[36px]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                        aria-label={`Select ${c.fullName}`}
                      />
                    </div>
                  </td>

                  {/* Company Name */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                        {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-slate-900 group-hover:text-apollo hover:underline transition-colors truncate max-w-[240px] lg:max-w-[340px] leading-tight">
                            {c.fullName}
                          </span>
                          {c.inDataMyne && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 shrink-0 leading-tight">
                              <Layers className="w-2.5 h-2.5 text-sky-600" />
                              DataMyne Lead
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5 leading-tight flex items-center gap-1.5 flex-wrap">
                          <span>{c.type}</span>
                          {c.salesPerson && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-indigo-600 font-medium">Rep: {c.salesPerson}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Customer Group (Design 1: Micro-Dot Pill) */}
                  <td className="py-3 px-3.5">
                    <JfllCustomerGroupBadge group={c.customerGroup} />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3.5">
                    {c.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Approach Status (For Inactive customers) */}
                  <td className="py-3 px-3.5 align-middle">
                    {c.status !== 'Active' ? (
                      <SalesStatusBadge
                        status={getCachedApproachStatus('jfll_customer', c.id)}
                        size="sm"
                      />
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Credit Status */}
                  <td className="py-3 px-3.5 align-middle">
                    {c.creditStatus ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                          c.creditStatus === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.creditStatus === 'blocked'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : c.creditStatus === 'high_risk'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : c.creditStatus === 'moderate_risk'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.creditStatus.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Recent Revenue (Last 3 Months) */}
                  <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                    {c.businessLast3m !== undefined && c.businessLast3m !== null ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        title={`₹${c.businessLast3m.toLocaleString('en-IN', { minimumFractionDigits: 2 })} in last 3 months`}
                      >
                        {formatIndianCurrency(c.businessLast3m)}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Contact Person */}
                  <td className="py-3 px-3.5 align-middle">
                    {c.contactPersonName ? (
                      <span className="text-xs text-slate-800 font-medium truncate max-w-[150px] inline-block leading-tight">
                        {c.contactPersonName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Phone Number with Indian Flag Icon */}
                  <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                    {phoneData ? (
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <IndiaFlagIcon className="w-4 h-3 shrink-0" />
                        <a
                          href={`tel:${phoneData.raw}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-slate-800 hover:text-apollo hover:underline font-medium leading-tight"
                        >
                          {phoneData.number}
                        </a>
                        <button
                          onClick={(e) => handleCopy(phoneData.raw, 'Phone', e)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                          title="Copy phone"
                          aria-label={`Copy phone number ${phoneData.number}`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="py-3 px-3.5 align-middle">
                    {c.email ? (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${c.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate max-w-[170px] text-xs text-slate-700 font-normal hover:text-apollo hover:underline leading-tight"
                          title={c.email}
                        >
                          {c.email}
                        </a>
                        <button
                          onClick={(e) => handleCopy(c.email!, 'Email', e)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                          title="Copy email"
                          aria-label={`Copy email ${c.email}`}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">—</span>
                    )}
                  </td>

                  {/* Action CTA: View, Approach, Convert */}
                  <td className="py-3 px-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCustomerClick(c);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded-md transition-all shadow-2xs group/btn cursor-pointer"
                        title={`View details for ${c.fullName}`}
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                        <span>View</span>
                      </button>

                      {c.status !== 'Active' && onLogApproach && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLogApproach(c);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo hover:text-white border border-apollo/30 rounded-md transition-all shadow-2xs cursor-pointer"
                          title={`Log sales approach for ${c.fullName}`}
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Approach</span>
                        </button>
                      )}

                      {c.status !== 'Active' &&
                        onConvertToActive &&
                        getCachedApproachStatus('jfll_customer', c.id) !== 'Converted to Active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onConvertToActive(c);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-300 rounded-md transition-all shadow-2xs cursor-pointer"
                            title={`Convert ${c.fullName} to Active customer`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                            <span>Convert</span>
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="min-h-12 border-t border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Showing{' '}
          <strong className="text-slate-800">
            {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </strong>{' '}
          to{' '}
          <strong className="text-slate-800">
            {Math.min(currentPage * pageSize, totalItems)}
          </strong>{' '}
          of <strong className="text-slate-800">{totalFormatted || totalItems}</strong>{' '}
          customers
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
