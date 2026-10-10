import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  RowSelectionState,
  OnChangeFn,
} from '@tanstack/react-table';
import { Lead } from '@/types/lead';
import { CompanyAvatar } from './CompanyAvatar';
import { StatusBadge } from './StatusBadge';
import {
  Mail,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  FilterX,
  RotateCcw,
} from 'lucide-react';

export interface LeadsTableProps {
  leads: Lead[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onLeadClick?: (lead: Lead) => void;
  onViewEmail?: (lead: Lead) => void;
  currentPage: number;
  totalPages: number;
  pageSize?: number;
  totalItems?: number;
  totalFormatted?: string;
  onPageChange: (page: number) => void;
  onClearFilters?: () => void;
  className?: string;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
  rowSelection,
  onRowSelectionChange,
  onLeadClick,
  onViewEmail,
  currentPage,
  totalPages,
  pageSize = 25,
  totalItems = 0,
  totalFormatted,
  onPageChange,
  onClearFilters,
  className = '',
}) => {
  // Define TanStack Table Columns matching Ref.jpg
  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      // 1. Selection Checkbox
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center pl-2">
            <button
              type="button"
              onClick={table.getToggleAllPageRowsSelectedHandler()}
              className="p-1 focus:outline-none"
              aria-label="Select all rows"
            >
              <div
                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                  table.getIsAllPageRowsSelected()
                    ? 'bg-apollo border-apollo text-white'
                    : table.getIsSomePageRowsSelected()
                    ? 'bg-apollo border-apollo text-white'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {table.getIsAllPageRowsSelected() && (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                )}
                {table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && (
                  <span className="w-2 h-0.5 bg-white rounded-full" />
                )}
              </div>
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center pl-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleSelected();
              }}
              className="p-1 focus:outline-none"
              aria-label={`Select ${row.original.name}`}
            >
              <div
                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                  row.getIsSelected()
                    ? 'bg-apollo border-apollo text-white'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {row.getIsSelected() && (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                )}
              </div>
            </button>
          </div>
        ),
        size: 44,
      },

      // 2. Name & Title
      {
        id: 'nameAndTitle',
        header: 'Name & Title',
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="min-w-0 pr-3">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onLeadClick?.(lead);
                }}
                className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-apollo hover:underline cursor-pointer truncate leading-tight"
                title={lead.name}
              >
                {lead.name}
              </div>
              <div
                className="text-[11px] sm:text-xs text-slate-500 font-normal truncate mt-0.5 leading-tight"
                title={lead.title}
              >
                {lead.title}
              </div>
            </div>
          );
        },
      },

      // 3. Company & Industry
      {
        id: 'companyAndIndustry',
        header: 'Company & Industry',
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex items-center space-x-3 min-w-0 pr-3">
              <CompanyAvatar
                company={lead.company}
                logoBgColor={lead.logoBgColor}
                logoTextColor={lead.logoTextColor}
                logoInitials={lead.logoInitials}
                companyLogo={lead.companyLogo}
              />
              <div className="min-w-0">
                <div
                  className="text-xs sm:text-sm font-medium text-slate-900 truncate leading-tight"
                  title={lead.company}
                >
                  {lead.company}
                </div>
                <div
                  className="text-[11px] sm:text-xs text-slate-500 font-normal truncate mt-0.5 leading-tight"
                  title={lead.industry}
                >
                  {lead.industry}
                </div>
              </div>
            </div>
          );
        },
      },

      // 4. Status Badge
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="shrink-0">
            <StatusBadge status={row.original.status} />
          </div>
        ),
        size: 110,
      },

      // 5. Location
      {
        id: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div
            className="text-xs sm:text-sm text-slate-700 font-normal truncate pr-2"
            title={row.original.location}
          >
            {row.original.location}
          </div>
        ),
      },

      // 6. Action CTA: View Email Button
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="pr-4 text-right shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewEmail?.(lead);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-apollo hover:text-white bg-white hover:bg-apollo border border-apollo/40 hover:border-apollo rounded-md shadow-2xs transition-colors focus:outline-none focus:ring-2 focus:ring-apollo/20 whitespace-nowrap"
                title={`View verified email for ${lead.name}`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>View Email</span>
              </button>
            </div>
          );
        },
        size: 130,
      },
    ],
    [onLeadClick, onViewEmail]
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  // Calculate pagination ranges
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || leads.length);
  const displayTotal = totalFormatted || (totalItems > 0 ? totalItems.toLocaleString() : leads.length.toString());

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden ${className}`}>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
            <div
              key={idx}
              className="px-4 py-3.5 flex items-center justify-between gap-4 animate-pulse bg-white"
            >
              <div className="w-4 h-4 rounded bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1.5 max-w-[220px]">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-2.5 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="flex items-center space-x-3 flex-1 max-w-[240px]">
                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-100 rounded-full shrink-0" />
              <div className="h-3 w-32 bg-slate-200 rounded shrink-0 hidden md:block" />
              <div className="h-7 w-24 bg-slate-100 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className={`p-8 text-center bg-white rounded-xl border border-red-200 max-w-md mx-auto my-12 shadow-sm ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-900">Failed to load leads</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          {error?.message || 'An unexpected error occurred while querying leads.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-md shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Request</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (leads.length === 0) {
    return (
      <div className={`p-12 text-center bg-white rounded-xl border border-surface-border max-w-md mx-auto my-12 shadow-sm ${className}`}>
        <FilterX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900">No leads match your criteria</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Try adjusting or clearing your filters in the sidebar to discover more prospects.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3.5 py-1.5 text-xs font-semibold text-apollo bg-apollo-50 hover:bg-apollo-100 border border-apollo-200 rounded-md transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  // 4. Data Table matching Ref.jpg
  return (
    <div className={`bg-white rounded-lg border border-surface-border shadow-2xs flex flex-col min-w-0 ${className}`}>
      <div className="overflow-x-auto min-w-0">
        <table className="w-full text-left border-collapse table-fixed">
          {/* Colgroup matching proportional spacing of Ref.jpg */}
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '27%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>

          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => {
              const isSelected = row.getIsSelected();
              return (
                <tr
                  key={row.id}
                  onClick={() => onLeadClick?.(row.original)}
                  className={`group transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-50/35 hover:bg-blue-50/50'
                      : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="py-3 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="px-4 py-3 bg-white border-t border-surface-border flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="font-medium text-slate-500">
          Showing <strong className="text-slate-800">{leads.length > 0 ? startItem : 0}</strong> -{' '}
          <strong className="text-slate-800">{endItem}</strong> of{' '}
          <strong className="text-slate-800">{displayTotal}</strong> leads
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-slate-500">
            Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
            <strong className="text-slate-900">{Math.max(1, totalPages)}</strong>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 hover:text-slate-900"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 hover:text-slate-900"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadsTable;
