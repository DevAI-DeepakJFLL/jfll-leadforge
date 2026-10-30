import React, { useState } from 'react';
import {
  ChevronDown,
  RotateCcw,
  Network,
  Building2,
  PhoneCall,
  Search,
  SlidersHorizontal,
  CreditCard,
  UserCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { JfllCustomerFilterParams } from '@/types/jfllCustomer';
import {
  getCustomerGroupFacetCounts,
  getLegalTypeFacetCounts,
  getContactReadinessFacetCounts,
  getCreditStatusFacetCounts,
  getSalesPersonFacetCounts,
  getRevenueRangeFacetCounts,
} from '@/services/jfllCustomerService';
import { CompactSalesApproachFilter } from '@/components/approach';

export interface JfllCustomerFilterSidebarProps {
  filters: JfllCustomerFilterParams;
  onToggleCustomerGroup: (group: string) => void;
  onToggleType: (type: string) => void;
  onToggleCreditStatus: (status: string) => void;
  onToggleSalesPerson: (salesPerson: string) => void;
  onToggleRevenueRange: (rangeId: string) => void;
  onToggleApproachStatus?: (status: string) => void;
  setApproachStatuses?: (statuses: string[]) => void;
  onToggleContactOption: (option: 'hasPhone' | 'hasEmail' | 'hasContactPerson') => void;
  onClearAll: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

export const JfllCustomerFilterSidebar: React.FC<JfllCustomerFilterSidebarProps> = ({
  filters,
  onToggleCustomerGroup,
  onToggleType,
  onToggleCreditStatus,
  onToggleSalesPerson,
  onToggleRevenueRange,
  onToggleApproachStatus,
  setApproachStatuses,
  onToggleContactOption,
  onClearAll,
  isMobileOpen = false,
  onCloseMobile,
  className = '',
}) => {
  const [openSections, setOpenSections] = useState({
    approach: true,
    revenue: true,
    groups: true,
    types: true,
    creditStatus: true,
    salesPerson: true,
    contacts: true,
  });

  const [groupSearch, setGroupSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [salesPersonSearch, setSalesPersonSearch] = useState('');

  const revenueRangesList = React.useMemo(
    () => getRevenueRangeFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const customerGroupsList = React.useMemo(
    () => getCustomerGroupFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const legalTypesList = React.useMemo(
    () => getLegalTypeFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const creditStatusesList = React.useMemo(
    () => getCreditStatusFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const salesPersonsList = React.useMemo(
    () => getSalesPersonFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const contactCounts = React.useMemo(
    () => getContactReadinessFacetCounts(filters.customerStatus || 'all'),
    [filters.customerStatus]
  );

  const toggleSection = (
    section: 'approach' | 'revenue' | 'groups' | 'types' | 'creditStatus' | 'salesPerson' | 'contacts'
  ) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedApproachStatuses = filters.approachStatuses || [];
  const selectedRevenueRanges = filters.revenueRanges || [];
  const selectedGroups = filters.customerGroups || [];
  const selectedTypes = filters.types || [];
  const selectedCreditStatuses = filters.creditStatuses || [];
  const selectedSalesPersons = filters.salesPersons || [];

  const filteredGroups = customerGroupsList.filter((g) =>
    g.label.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredTypes = legalTypesList.filter((t) =>
    t.label.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const filteredSalesPersons = salesPersonsList.filter((sp) =>
    sp.label.toLowerCase().includes(salesPersonSearch.toLowerCase())
  );

  const activeCount =
    selectedApproachStatuses.length +
    selectedRevenueRanges.length +
    selectedGroups.length +
    selectedTypes.length +
    selectedCreditStatuses.length +
    selectedSalesPersons.length +
    (filters.hasPhone ? 1 : 0) +
    (filters.hasEmail ? 1 : 0) +
    (filters.hasContactPerson ? 1 : 0);

  const filterContent = (
    <>
      {/* Sidebar Header */}
      <div className="h-11 px-4 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-apollo" />
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Customer Filters
          </span>
          {activeCount > 0 && (
            <span className="bg-apollo text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-apollo transition-colors cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {/* Accordion: Sales Approach Status (Always available, crucial for Inactive leads) */}
        <div>
          <button
            onClick={() => toggleSection('approach')}
            aria-expanded={openSections.approach}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-apollo" />
              <span className="text-xs font-semibold text-slate-800">
                Sales Approach Status
              </span>
              {selectedApproachStatuses.length > 0 && (
                <span className="bg-apollo/10 text-apollo text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedApproachStatuses.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.approach ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.approach && (
            <div className="px-4 pb-3">
              <CompactSalesApproachFilter
                selectedStatuses={selectedApproachStatuses}
                onToggleStatus={(st) => onToggleApproachStatus?.(st)}
                onSelectStatuses={setApproachStatuses}
                onClear={() => {
                  if (setApproachStatuses) {
                    setApproachStatuses([]);
                  } else if (onToggleApproachStatus) {
                    selectedApproachStatuses.forEach((st) => onToggleApproachStatus(st));
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Accordion 1: Contact Readiness */}
        <div>
          <button
            onClick={() => toggleSection('contacts')}
            aria-expanded={openSections.contacts}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">
                Contact Readiness
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.contacts ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.contacts && (
            <div className="px-4 pb-3 space-y-2">
              <label className="flex items-center justify-between text-xs cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!filters.hasContactPerson}
                    onChange={() => onToggleContactOption('hasContactPerson')}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                  />
                  <span className="text-slate-700 group-hover:text-slate-900">
                    Named Contact Person
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{contactCounts.hasContactPerson}</span>
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!filters.hasPhone}
                    onChange={() => onToggleContactOption('hasPhone')}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                  />
                  <span className="text-slate-700 group-hover:text-slate-900">
                    Direct Mobile Number
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{contactCounts.hasPhone}</span>
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!filters.hasEmail}
                    onChange={() => onToggleContactOption('hasEmail')}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                  />
                  <span className="text-slate-700 group-hover:text-slate-900">
                    Contact with Email
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{contactCounts.hasEmail}</span>
              </label>
            </div>
          )}
        </div>

        {/* Accordion 2: Recent Revenue (Last 3 Months) */}
        {filters.customerStatus !== 'inactive' && (
          <div>
            <button
              onClick={() => toggleSection('revenue')}
              aria-expanded={openSections.revenue}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Recent Revenue (3M)
                </span>
                {selectedRevenueRanges.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {selectedRevenueRanges.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openSections.revenue ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSections.revenue && (
              <div className="px-4 pb-3 space-y-1.5">
                {revenueRangesList.map((range) => {
                  const isChecked = selectedRevenueRanges.includes(range.id);
                  return (
                    <label
                      key={range.id}
                      className="flex items-center justify-between text-xs cursor-pointer group py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleRevenueRange(range.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <span
                            className={`block leading-tight ${
                              isChecked
                                ? 'text-slate-900 font-semibold'
                                : 'text-slate-700 group-hover:text-slate-900'
                            }`}
                          >
                            {range.label}
                          </span>
                          {range.sublabel && (
                            <span className="text-[10px] text-slate-400 block leading-tight">
                              {range.sublabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                        {range.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Accordion 3: Customer Group */}
        <div>
          <button
            onClick={() => toggleSection('groups')}
            aria-expanded={openSections.groups}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-800">Customer Group</span>
              {selectedGroups.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedGroups.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.groups ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.groups && (
            <div className="px-4 pb-3 space-y-2">
              {customerGroupsList.length > 5 && (
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search group..."
                    className="w-full pl-7 pr-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-apollo"
                  />
                </div>
              )}

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredGroups.map((group) => {
                  const isChecked = selectedGroups.includes(group.label);
                  return (
                    <label
                      key={group.label}
                      className="flex items-center justify-between text-xs cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCustomerGroup(group.label)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? 'text-slate-900 font-medium'
                              : 'text-slate-700 group-hover:text-slate-900'
                          }`}
                        >
                          {group.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                        {group.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 3: Legal Entity Type */}
        <div>
          <button
            onClick={() => toggleSection('types')}
            aria-expanded={openSections.types}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">
                Legal Entity Type
              </span>
              {selectedTypes.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {selectedTypes.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${
                openSections.types ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openSections.types && (
            <div className="px-4 pb-3 space-y-2">
              <div className="relative mb-2">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  placeholder="Search legal type..."
                  className="w-full pl-7 pr-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-apollo"
                />
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredTypes.map((type) => {
                  const isChecked = selectedTypes.includes(type.label);
                  return (
                    <label
                      key={type.label}
                      className="flex items-center justify-between text-xs cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleType(type.label)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                        />
                        <span
                          className={`truncate ${
                            isChecked
                              ? 'text-slate-900 font-medium'
                              : 'text-slate-700 group-hover:text-slate-900'
                          }`}
                        >
                          {type.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                        {type.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: Credit Status */}
        {creditStatusesList.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('creditStatus')}
              aria-expanded={openSections.creditStatus}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Credit Status
                </span>
                {selectedCreditStatuses.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {selectedCreditStatuses.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openSections.creditStatus ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSections.creditStatus && (
              <div className="px-4 pb-3 space-y-1.5">
                {creditStatusesList.map((cs) => {
                  const isChecked = selectedCreditStatuses.includes(cs.value);
                  const dotColor =
                    cs.value === 'approved'
                      ? 'bg-emerald-500'
                      : cs.value === 'moderate_risk'
                      ? 'bg-amber-500'
                      : cs.value === 'high_risk'
                      ? 'bg-orange-500'
                      : cs.value === 'blocked'
                      ? 'bg-red-500'
                      : 'bg-slate-400';

                  return (
                    <label
                      key={cs.value}
                      className="flex items-center justify-between text-xs cursor-pointer group py-0.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCreditStatus(cs.value)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                        />
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span
                          className={`truncate ${
                            isChecked
                              ? 'text-slate-900 font-medium'
                              : 'text-slate-700 group-hover:text-slate-900'
                          }`}
                        >
                          {cs.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                        {cs.count}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Accordion 5: Sales Representative */}
        {salesPersonsList.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('salesPerson')}
              aria-expanded={openSections.salesPerson}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Sales Representative
                </span>
                {selectedSalesPersons.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {selectedSalesPersons.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openSections.salesPerson ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openSections.salesPerson && (
              <div className="px-4 pb-3 space-y-2">
                {salesPersonsList.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={salesPersonSearch}
                      onChange={(e) => setSalesPersonSearch(e.target.value)}
                      placeholder="Search sales person..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:border-apollo"
                    />
                  </div>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredSalesPersons.map((sp) => {
                    const isChecked = selectedSalesPersons.includes(sp.label);
                    return (
                      <label
                        key={sp.label}
                        className="flex items-center justify-between text-xs cursor-pointer group py-0.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleSalesPerson(sp.label)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-apollo focus:ring-apollo cursor-pointer"
                          />
                          <span
                            className={`truncate ${
                              isChecked
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-700 group-hover:text-slate-900'
                            }`}
                          >
                            {sp.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                          {sp.count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (lg: and up) */}
      <aside
        className={`hidden lg:flex w-72 lg:w-80 h-full border-r border-surface-border bg-white flex-col shrink-0 overflow-hidden select-none ${className}`}
        aria-label="JFLL Customer Filters Sidebar"
      >
        {filterContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer (lg:hidden) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Slide-over panel */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header with close button */}
            <div className="h-14 px-4 border-b border-surface-border flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-apollo" />
                <h2 className="text-sm font-bold text-slate-900">Customer Filters</h2>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
};

export default JfllCustomerFilterSidebar;
