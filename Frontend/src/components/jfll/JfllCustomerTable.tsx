import React from 'react';
import { RowSelectionState } from '@tanstack/react-table';
import {
  Building2,
  Mail,
  Phone,
  Copy,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Eye,
  MapPin,
} from 'lucide-react';
import { JfllCustomer } from '@/types/jfllCustomer';
import { JfllCustomerGroupBadge } from './JfllCustomerGroupBadge';
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
          Try loosening your search keywords or resetting your Customer Group and Legal Form filters.
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
      className={`bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs flex flex-col ${className}`}
    >
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3.5 w-12 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-4 min-w-[280px]">Company Name</th>
              <th className="py-3 px-3.5 min-w-[150px]">Customer Group</th>
              <th className="py-3 px-3.5 min-w-[100px]">Status</th>
              <th className="py-3 px-3.5 min-w-[160px]">Contact Person</th>
              <th className="py-3 px-3.5 min-w-[155px]">Phone Number</th>
              <th className="py-3 px-3.5 min-w-[200px]">Email Address</th>
              <th className="py-3 px-4 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/90">
            {customers.map((c) => {
              const isSelected = !!rowSelection[c.id];
              const initials = c.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              return (
                <tr
                  key={c.id}
                  onClick={() => onCustomerClick(c)}
                  className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                    isSelected ? 'bg-blue-50/35' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3.5 px-3.5 text-center"
                    onClick={(e) => handleToggleRow(c.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                      aria-label={`Select ${c.fullName}`}
                    />
                  </td>

                  {/* Company Name & Metadata */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200/80 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs group-hover:border-apollo/30 transition-colors">
                        {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[240px] lg:max-w-[340px] group-hover:text-apollo transition-colors">
                          {c.fullName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                            {c.type}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <MapPin className="w-2.5 h-2.5" />
                            {c.territory}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Customer Group */}
                  <td className="py-3.5 px-3.5">
                    <JfllCustomerGroupBadge group={c.customerGroup} />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </td>

                  {/* Contact Person */}
                  <td className="py-3.5 px-3.5">
                    {c.contactPersonName ? (
                      <div className="flex items-center gap-2 text-slate-900 font-medium truncate max-w-[150px]">
                        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                          {c.contactPersonName[0].toUpperCase()}
                        </div>
                        <span className="truncate">{c.contactPersonName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] pl-1">Unassigned</span>
                    )}
                  </td>

                  {/* Mobile Phone */}
                  <td className="py-3.5 px-3.5">
                    {c.mobileNumber ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-50/80 hover:bg-white border border-slate-200 px-2 py-1 rounded-md transition-colors group/tel">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <a
                          href={`tel:${c.mobileNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[11px] text-slate-800 hover:text-apollo transition-colors"
                        >
                          {c.mobileNumber}
                        </a>
                        <button
                          onClick={(e) => handleCopy(c.mobileNumber!, 'Phone', e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors ml-0.5"
                          title="Copy phone"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] pl-1">—</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="py-3.5 px-3.5">
                    {c.email ? (
                      <div className="inline-flex items-center gap-1.5 bg-slate-50/80 hover:bg-white border border-slate-200 px-2 py-1 rounded-md transition-colors group/mail max-w-[190px]">
                        <Mail className="w-3 h-3 text-blue-600 shrink-0" />
                        <a
                          href={`mailto:${c.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-[11px] text-slate-700 hover:text-apollo transition-colors"
                          title={c.email}
                        >
                          {c.email}
                        </a>
                        <button
                          onClick={(e) => handleCopy(c.email!, 'Email', e)}
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0 ml-0.5"
                          title="Copy email"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] pl-1">—</span>
                    )}
                  </td>

                  {/* Action CTA: Clear "View" button */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCustomerClick(c);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-apollo hover:text-white border border-slate-200 hover:border-apollo rounded-md transition-all shadow-2xs group/btn"
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
