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
} from 'lucide-react';
import { JfllCustomer } from '@/types/jfllCustomer';
import { useToast } from '@/components/ui';

export interface JfllCustomerTableProps {
  customers: JfllCustomer[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onCustomerClick: (customer: JfllCustomer) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  totalFormatted?: string;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
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
 * Normalizes phone numbers by stripping +91 prefix for pairing with the Indian flag icon
 */
export function formatPhoneNumber(phone: string | null | undefined): { number: string; raw: string } | null {
  if (!phone || !phone.trim()) return null;
  const raw = phone.trim();
  // Strip leading +91-, +91, 91-, or +
  const cleaned = raw.replace(/^(\+91[-\s]?|91[-\s]?|\+)/, '').trim();
  return {
    number: cleaned || raw,
    raw,
  };
}

export const JfllCustomerTable: React.FC<JfllCustomerTableProps> = ({
  customers,
  rowSelection,
  onRowSelectionChange,
  onCustomerClick,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalFormatted,
  onPageChange,
  onClearFilters,
  className = '',
}) => {
  const { showToast } = useToast();

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
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-4 min-w-[280px]">Company Name</th>
              <th className="py-3 px-3.5 min-w-[100px]">Status</th>
              <th className="py-3 px-3.5 min-w-[160px]">Contact Person</th>
              <th className="py-3 px-3.5 min-w-[160px]">Phone Number</th>
              <th className="py-3 px-3.5 min-w-[200px]">Email</th>
              <th className="py-3 px-4 w-20 text-center">Action</th>
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
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => handleToggleRow(c.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                      aria-label={`Select ${c.fullName}`}
                    />
                  </td>

                  {/* Company Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700 shrink-0">
                        {initials || <Building2 className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[260px] lg:max-w-[360px]">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {c.type}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </td>

                  {/* Contact Person */}
                  <td className="py-3 px-3.5">
                    {c.contactPersonName ? (
                      <span className="text-slate-800 font-medium truncate max-w-[150px] inline-block">
                        {c.contactPersonName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>

                  {/* Phone Number with Indian Flag Icon */}
                  <td className="py-3 px-3.5">
                    {phoneData ? (
                      <div className="flex items-center gap-1.5 text-slate-800">
                        <IndiaFlagIcon className="w-4 h-3 shrink-0" />
                        <a
                          href={`tel:${phoneData.raw}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs hover:text-apollo hover:underline"
                        >
                          {phoneData.number}
                        </a>
                        <button
                          onClick={(e) => handleCopy(phoneData.raw, 'Phone', e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="py-3 px-3.5">
                    {c.email ? (
                      <div className="flex items-center gap-1 text-slate-700">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${c.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate max-w-[160px] text-[11px] font-mono text-slate-600 hover:text-apollo hover:underline"
                          title={c.email}
                        >
                          {c.email}
                        </a>
                        <button
                          onClick={(e) => handleCopy(c.email!, 'Email', e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>

                  {/* Action CTA: View Button */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCustomerClick(c);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded transition-all shadow-2xs group/btn"
                      title={`View details for ${c.fullName}`}
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="h-12 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-xs text-slate-600">
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
            className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
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
            className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
