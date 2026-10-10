import React, { useState } from 'react';
import {
  ChevronDown,
  RotateCcw,
  Network,
  Building2,
  PhoneCall,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { JfllCustomerFilterParams } from '@/types/jfllCustomer';

export interface JfllCustomerFilterSidebarProps {
  filters: JfllCustomerFilterParams;
  onToggleCustomerGroup: (group: string) => void;
  onToggleType: (type: string) => void;
  onToggleContactOption: (option: 'hasPhone' | 'hasEmail' | 'hasContactPerson') => void;
  onClearAll: () => void;
  className?: string;
}

const CUSTOMER_GROUPS = [
  { label: 'Subagent', count: 474 },
  { label: 'Shipper / Consignee', count: 339 },
  { label: 'Overseas Agent', count: 49 },
  { label: 'GSA', count: 8 },
  { label: 'NVOCC / Coloader', count: 6 },
  { label: 'Airline', count: 1 },
  { label: 'Custom Broker', count: 1 },
];

const LEGAL_TYPES = [
  { label: 'Company', count: 443 },
  { label: 'Private Limited', count: 238 },
  { label: 'Individual / Proprietorship', count: 118 },
  { label: 'Partnership', count: 39 },
  { label: 'Public Limited', count: 21 },
  { label: 'LLP', count: 20 },
];

export const JfllCustomerFilterSidebar: React.FC<JfllCustomerFilterSidebarProps> = ({
  filters,
  onToggleCustomerGroup,
  onToggleType,
  onToggleContactOption,
  onClearAll,
  className = '',
}) => {
  const [openSections, setOpenSections] = useState({
    groups: true,
    types: true,
    contacts: true,
  });

  const [groupSearch, setGroupSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  const toggleSection = (section: 'groups' | 'types' | 'contacts') => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedGroups = filters.customerGroups || [];
  const selectedTypes = filters.types || [];

  const filteredGroups = CUSTOMER_GROUPS.filter((g) =>
    g.label.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredTypes = LEGAL_TYPES.filter((t) =>
    t.label.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const activeCount =
    selectedGroups.length +
    selectedTypes.length +
    (filters.hasPhone ? 1 : 0) +
    (filters.hasEmail ? 1 : 0) +
    (filters.hasContactPerson ? 1 : 0);

  return (
    <aside
      className={`w-72 lg:w-80 h-full border-r border-surface-border bg-white flex flex-col shrink-0 overflow-hidden select-none ${className}`}
      aria-label="JFLL Customer Filters Sidebar"
    >
      {/* Sidebar Header */}
      <div className="h-11 px-4 border-b border-surface-border flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-apollo" />
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            Customer Filters
          </span>
          {activeCount > 0 && (
            <span className="bg-apollo text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-apollo transition-colors"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {/* Accordion 1: Contact Readiness */}
        <div>
          <button
            onClick={() => toggleSection('contacts')}
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
                <span className="text-[11px] font-mono text-slate-400">729</span>
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
                <span className="text-[11px] font-mono text-slate-400">657</span>
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
                    Verified Email
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">703</span>
              </label>
            </div>
          )}
        </div>

        {/* Accordion 2: Customer Group */}
        <div>
          <button
            onClick={() => toggleSection('groups')}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-800">Customer Group</span>
              {selectedGroups.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
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
              {CUSTOMER_GROUPS.length > 5 && (
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
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-800">
                Legal Entity Type
              </span>
              {selectedTypes.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
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
      </div>
    </aside>
  );
};
