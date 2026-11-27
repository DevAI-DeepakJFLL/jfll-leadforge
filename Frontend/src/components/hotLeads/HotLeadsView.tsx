import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Flame,
  Search,
  X,
  Building2,
  UserCheck,
  RotateCcw,
  TrendingUp,
  FileText,
  Ship,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Mail,
  Copy,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Globe,
  Clock,
  Pencil,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import {
  HotLead,
  HotLeadSegment,
  HotLeadCategory,
  HotLeadContactFilter,
  HotLeadRegionId,
  HotLeadContactUpdatePayload,
} from '@/types/hotLeads';
import { HOT_LEADS_DATA, HOT_LEAD_REGIONS } from '@/data/hotLeadsData';
import {
  fetchHotLeads,
  formatInrCurrency,
  computeHotLeadsMetrics,
  hasHotLeadContact,
  getHotLeadCategory,
  updateHotLeadContact,
  HOT_LEADS_UPDATED_EVENT,
} from '@/services/hotLeadsService';
import { HotLeadDetailDrawer } from './HotLeadDetailDrawer';
import { IndiaFlagIcon, formatPhoneNumber } from '../jfll/JfllCustomerTable';
import {
  getTrackedLeadByCompanyOrId,
  TRACKER_UPDATED_EVENT,
} from '@/services/leadTrackerService';
import { AssignedBadge } from '@/components/ui/AssignedBadge';

export interface HotLeadsViewProps {
  initialSearchQuery?: string;
  initialSegment?: HotLeadSegment;
  initialRegion?: HotLeadRegionId;
  onFilterChange?: (segment: HotLeadSegment, query: string, region: HotLeadRegionId) => void;
  onFindInDatamyne?: (query: string) => void;
  onFindInApollo?: (query: string) => void;
  onNavigateToReport?: (companyName: string) => void;
}

export const HotLeadsView: React.FC<HotLeadsViewProps> = ({
  initialSearchQuery = '',
  initialSegment = 'all',
  initialRegion = 'all',
  onFilterChange,
  onFindInDatamyne,
  onFindInApollo,
  onNavigateToReport,
}) => {
  // Parse initial segment into category and contact filter
  const initialCat: HotLeadCategory = useMemo(() => {
    if (initialSegment === 'active' || initialSegment === 'active-with-contacts' || initialSegment === 'active-without-contacts') return 'active';
    if (initialSegment === 'inactive' || initialSegment === 'reactivations' || initialSegment === 'inactive-with-contacts' || initialSegment === 'inactive-without-contacts') return 'inactive';
    if (initialSegment === 'fresh' || initialSegment === 'prospects' || initialSegment === 'fresh-with-contacts' || initialSegment === 'fresh-without-contacts') return 'fresh';
    return 'all';
  }, [initialSegment]);

  const initialContact: HotLeadContactFilter = useMemo(() => {
    if (initialSegment.includes('with-contacts') || initialSegment === 'with-decision-makers') return 'with-contacts';
    if (initialSegment.includes('without-contacts')) return 'without-contacts';
    return 'all';
  }, [initialSegment]);

  const [category, setCategory] = useState<HotLeadCategory>(initialCat);
  const [contactFilter, setContactFilter] = useState<HotLeadContactFilter>(initialContact);
  const [selectedRegion, setSelectedRegion] = useState<HotLeadRegionId>(initialRegion || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [sortBy, setSortBy] = useState<'turnover' | 'name' | 'status' | 'region'>('turnover');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLead, setSelectedLead] = useState<HotLead | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [records, setRecords] = useState<HotLead[]>(() => {
    if (!initialRegion || initialRegion === 'all') return HOT_LEADS_DATA;
    return HOT_LEADS_DATA.filter((l) => (l.regionId || 'delhi') === initialRegion);
  });
  const [metrics, setMetrics] = useState(() => computeHotLeadsMetrics(HOT_LEADS_DATA, initialRegion || 'all'));
  const [, setCopiedKey] = useState<string | null>(null);
  const [, setTrackerVersion] = useState(0);

  // Inline editing state for sales coordinators (persists directly to SQLite database)
  const [editingCell, setEditingCell] = useState<{
    srNo: number;
    field: 'phone' | 'contactPerson' | 'email';
    value: string;
  } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Sync state if props change externally
  useEffect(() => {
    setCategory(initialCat);
    setContactFilter(initialContact);
  }, [initialCat, initialContact]);

  useEffect(() => {
    if (initialRegion) {
      setSelectedRegion(initialRegion);
    }
  }, [initialRegion]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const onFilterChangeRef = useRef(onFilterChange);
  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => {
    const handleTrackerUpdate = () => {
      setTrackerVersion((v) => v + 1);
    };
    window.addEventListener(TRACKER_UPDATED_EVENT, handleTrackerUpdate);
    return () => {
      window.removeEventListener(TRACKER_UPDATED_EVENT, handleTrackerUpdate);
    };
  }, []);

  // Sync with hot leads contact updates dispatched across views
  useEffect(() => {
    const handleHotLeadUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ srNo: number; phone?: string; contactPerson?: string; email?: string }>;
      if (customEvent.detail) {
        const { srNo, phone, contactPerson, email } = customEvent.detail;
        setRecords((prev) =>
          prev.map((item) => {
            if (item.srNo === srNo) {
              const updated = { ...item };
              if (phone !== undefined && phone !== null) updated.phone = phone;
              if (contactPerson !== undefined && contactPerson !== null) updated.contactPerson = contactPerson;
              if (email !== undefined && email !== null) updated.email = email;
              updated.isCustomContact = true;
              return updated;
            }
            return item;
          })
        );
      }
    };
    window.addEventListener(HOT_LEADS_UPDATED_EVENT, handleHotLeadUpdated);
    return () => {
      window.removeEventListener(HOT_LEADS_UPDATED_EVENT, handleHotLeadUpdated);
    };
  }, []);

  const handleSaveInlineEdit = async (_lead?: HotLead) => {
    if (!editingCell || isSavingCell) return;
    setIsSavingCell(true);
    try {
      const val = editingCell.value.trim();
      const payload: HotLeadContactUpdatePayload = {
        phone: editingCell.field === 'phone' ? val : undefined,
        contactPerson: editingCell.field === 'contactPerson' ? val : undefined,
        email: editingCell.field === 'email' ? val : undefined,
      };
      await updateHotLeadContact(editingCell.srNo, payload);

      setRecords((prev) => {
        const next = prev.map((item) => {
          if (item.srNo === editingCell.srNo) {
            const updated = { ...item };
            if (editingCell.field === 'phone') updated.phone = val;
            if (editingCell.field === 'contactPerson') updated.contactPerson = val;
            if (editingCell.field === 'email') updated.email = val;
            updated.isCustomContact = true;
            return updated;
          }
          return item;
        });
        setMetrics(computeHotLeadsMetrics(next, selectedRegion));
        return next;
      });

      if (selectedLead?.srNo === editingCell.srNo) {
        setSelectedLead((prev) => {
          if (!prev) return null;
          const updated = { ...prev };
          if (editingCell.field === 'phone') updated.phone = val;
          if (editingCell.field === 'contactPerson') updated.contactPerson = val;
          if (editingCell.field === 'email') updated.email = val;
          updated.isCustomContact = true;
          return updated;
        });
      }

      setEditingCell(null);
    } catch {
      // Revert editing on failure
    } finally {
      setIsSavingCell(false);
    }
  };
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('jfll_hotleads_overview_collapsed') === 'true';
      }
    } catch {
      // Ignored
    }
    return false;
  });

  const handleToggleOverviewCollapse = (collapsed: boolean) => {
    setIsOverviewCollapsed(collapsed);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('jfll_hotleads_overview_collapsed', String(collapsed));
      }
    } catch {
      // Ignored
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute composite segment string
  const currentSegment: HotLeadSegment = useMemo(() => {
    if (category === 'all') {
      if (contactFilter === 'with-contacts') return 'with-contacts';
      if (contactFilter === 'without-contacts') return 'without-contacts';
      return 'all';
    }
    if (contactFilter === 'with-contacts') return `${category}-with-contacts` as HotLeadSegment;
    if (contactFilter === 'without-contacts') return `${category}-without-contacts` as HotLeadSegment;
    return category;
  }, [category, contactFilter]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchHotLeads({
        q: searchQuery,
        category,
        contactFilter,
        segment: currentSegment,
        region: selectedRegion,
        sortBy,
        sortOrder,
      });
      setRecords(res.items);
      setMetrics(res.metrics);
    } catch {
      // Handled in service fallback
    }
  }, [searchQuery, category, contactFilter, currentSegment, selectedRegion, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
    onFilterChangeRef.current?.(currentSegment, searchQuery, selectedRegion);
  }, [loadData, currentSegment, searchQuery, selectedRegion]);

  const activeRegionMeta = useMemo(() => {
    return HOT_LEAD_REGIONS.find((r) => r.id === selectedRegion) || HOT_LEAD_REGIONS[0];
  }, [selectedRegion]);

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleSortToggle = (field: 'turnover' | 'name' | 'status' | 'region') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'turnover' ? 'desc' : 'asc');
    }
  };

  const handleRowClick = (lead: HotLead) => {
    setSelectedLead(lead);
    setIsDrawerOpen(true);
  };

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1500);
  };

  // Dynamic counts for contact sub-tabs based on current category
  const contactSubCounts = useMemo(() => {
    if (category === 'active') {
      return {
        all: metrics.activeCount,
        withContacts: metrics.activeWithContactsCount,
        withoutContacts: metrics.activeWithoutContactsCount,
      };
    }
    if (category === 'inactive') {
      return {
        all: metrics.inactiveCount,
        withContacts: metrics.inactiveWithContactsCount,
        withoutContacts: metrics.inactiveWithoutContactsCount,
      };
    }
    if (category === 'fresh') {
      return {
        all: metrics.freshCount,
        withContacts: metrics.freshWithContactsCount,
        withoutContacts: metrics.freshWithoutContactsCount,
      };
    }
    return {
      all: metrics.totalCount,
      withContacts: metrics.withContactsCount,
      withoutContacts: metrics.withoutContactsCount,
    };
  }, [category, metrics]);

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col min-h-0 overflow-hidden">
      {/* Top Banner / Header */}
      <div
        className={`bg-white border-b border-slate-200 px-4 sm:px-6 shrink-0 shadow-2xs transition-all ${
          isOverviewCollapsed ? 'py-2.5' : 'py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-1.5 sm:p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-500/20" />
                </div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 shrink-0">
                  <span>Hot High-Turnover Leads</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    {activeRegionMeta.status === 'live'
                      ? `${metrics.totalCount} Enterprise Accounts`
                      : activeRegionMeta.upcomingQuarter?.includes('Ingestion')
                      ? activeRegionMeta.upcomingQuarter
                      : `${activeRegionMeta.upcomingQuarter || 'Pipeline'} Ingestion`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    {activeRegionMeta.shortName}
                  </span>
                </h1>

                {/* Compact inline summary shown when overview is collapsed */}
                {isOverviewCollapsed && (
                  <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-normal pl-1">
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-emerald-700 font-mono">
                      {formatInrCurrency(metrics.totalTurnover)}
                    </span>
                    <span className="text-slate-400">turnover</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-emerald-700 font-medium">{metrics.activeCount} Active</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-700 font-medium">{metrics.inactiveCount} Inactive</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-blue-700 font-medium">{metrics.freshCount} Fresh</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-purple-700 font-medium">{metrics.withContactsCount} With Contacts</span>
                  </div>
                )}
              </div>

              {!isOverviewCollapsed && (
                <p className="text-xs text-slate-500 mt-1.5 max-w-3xl leading-relaxed">
                  {activeRegionMeta.id === 'all'
                    ? 'Consolidated pan-India enterprise freight accounts with high commercial turnover (₹47.66 Cr billing). Multi-region expansion connects regional operating branches with decision-maker intelligence.'
                    : activeRegionMeta.id === 'delhi'
                    ? '60 verified enterprise freight accounts in Delhi NCR with high commercial turnover (₹47.66 Cr billing). Segmented into JFLL Active, JFLL Inactive, and Fresh Data with direct decision-maker contact details.'
                    : `${activeRegionMeta.description} Target gateways: ${activeRegionMeta.gateways?.join(', ')}.`}
                </p>
              )}
            </div>

            {/* Maximize Table / Show Overview Toggle Button */}
            <button
              type="button"
              onClick={() => handleToggleOverviewCollapse(!isOverviewCollapsed)}
              aria-expanded={!isOverviewCollapsed}
              aria-label={isOverviewCollapsed ? 'Show overview metrics and summary' : 'Maximize table vertical space'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs cursor-pointer shrink-0"
              title={isOverviewCollapsed ? 'Show overview metrics and summary' : 'Maximize table vertical space'}
            >
              {isOverviewCollapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Show Overview</span>
                  <span className="sm:hidden">Overview</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Maximize Table</span>
                  <span className="sm:hidden">Maximize</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Regional Sourcing Hub Selector Bar */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Sourcing Hub:</span>
            </span>
            {HOT_LEAD_REGIONS.map((region) => {
              const isSelected = selectedRegion === region.id;
              const isLive = region.status === 'live';
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setSelectedRegion(region.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {region.id === 'all' ? (
                    <Globe className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`} />
                  ) : (
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`} />
                  )}
                  <span>{region.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                      isSelected
                        ? 'bg-blue-700/80 text-blue-100'
                        : isLive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {region.code} {isLive ? `(${region.totalAccounts})` : 'Pipeline'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Regional Summary Chip */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <span className="text-slate-400">Coverage:</span>
            <span className="font-medium text-slate-800">{activeRegionMeta.coverage}</span>
            {activeRegionMeta.status === 'upcoming' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock className="w-3 h-3" />
                Ingestion {activeRegionMeta.upcomingQuarter || 'Pipeline'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Metrics Strip */}
      {!isOverviewCollapsed && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Metric 1: Total Turnover */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col hover:border-slate-300 transition-colors shadow-2xs">
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Annual Turnover
                </span>
                <span className="text-lg font-extrabold text-emerald-700 mt-1 font-mono tracking-tight">
                  {formatInrCurrency(metrics.totalTurnover)}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {activeRegionMeta.status === 'live'
                    ? `Across ${metrics.totalCount} enterprise accounts`
                    : `${activeRegionMeta.name} in pipeline`}
                </span>
              </div>

              {/* Metric 2: JFLL Active */}
              <div
                onClick={() => {
                  setCategory('active');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'active'
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  JFLL Active
                </span>
                <span className="text-lg font-extrabold text-emerald-700 mt-1 tracking-tight">
                  {metrics.activeCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.activeWithContactsCount} With Contacts · {metrics.activeWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 3: JFLL Inactive */}
              <div
                onClick={() => {
                  setCategory('inactive');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'inactive'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-amber-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  JFLL Inactive
                </span>
                <span className="text-lg font-extrabold text-amber-700 mt-1 tracking-tight">
                  {metrics.inactiveCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.inactiveWithContactsCount} With Contacts · {metrics.inactiveWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 4: Fresh Data */}
              <div
                onClick={() => {
                  setCategory('fresh');
                  setContactFilter('all');
                }}
                className={`p-3 rounded-xl border flex flex-col transition-all cursor-pointer shadow-2xs ${
                  category === 'fresh'
                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-blue-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Fresh Data
                </span>
                <span className="text-lg font-extrabold text-blue-700 mt-1 tracking-tight">
                  {metrics.freshCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.freshWithContactsCount} With Contacts · {metrics.freshWithoutContactsCount} Without
                </span>
              </div>

              {/* Metric 5: Contact Coverage */}
              <div
                onClick={() => {
                  setCategory('all');
                  setContactFilter('with-contacts');
                }}
                className={`p-3 rounded-xl border flex flex-col col-span-2 sm:col-span-1 transition-all cursor-pointer shadow-2xs ${
                  contactFilter === 'with-contacts' && category === 'all'
                    ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400'
                    : 'bg-slate-50/80 border-slate-200/80 hover:border-purple-300'
                }`}
              >
                <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                  Contact Coverage
                </span>
                <span className="text-lg font-extrabold text-purple-700 mt-1 tracking-tight">
                  {metrics.withContactsCount} / {metrics.totalCount}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {metrics.withContactsCount} With Contacts · {metrics.withoutContactsCount} Without
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 flex-1 flex flex-col min-h-0 gap-3 overflow-hidden">
        {/* Controls Bar: 2-Tier Segment Tabs (Category + With/Without Contacts) + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Tier 1 & Tier 2 Segment Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Category Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`All Accounts (${metrics.totalCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'active'
                    ? 'bg-white text-emerald-700 shadow-2xs border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`JFLL Active (${metrics.activeCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('inactive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'inactive'
                    ? 'bg-white text-amber-700 shadow-2xs border border-amber-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`JFLL Inactive (${metrics.inactiveCount})`}
              </button>
              <button
                type="button"
                onClick={() => setCategory('fresh')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  category === 'fresh'
                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {`Fresh Data (${metrics.freshCount})`}
              </button>
            </div>

            {/* Sub-Split Pills: With Contacts / Without Contacts */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setContactFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  contactFilter === 'all'
                    ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {`All (${contactSubCounts.all})`}
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('with-contacts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                  contactFilter === 'with-contacts'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold border border-emerald-200'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{`With Contacts (${contactSubCounts.withContacts})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setContactFilter('without-contacts')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  contactFilter === 'without-contacts'
                    ? 'bg-white text-slate-700 shadow-2xs font-semibold border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {`Without Contacts (${contactSubCounts.withoutContacts})`}
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDownSearch}
              placeholder="Search company, sales rep, decision maker..."
              maxLength={100}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs flex-1 flex flex-col min-h-0">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 sticky top-0 z-10 select-none">
                <tr className="text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th scope="col" className="py-2.5 px-3 w-10 text-center font-semibold text-slate-500">#</th>
                  <th
                    scope="col"
                    className="py-2.5 px-4 min-w-[220px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Company Name</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 min-w-[130px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('region')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Region / Hub</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 min-w-[125px] text-right font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('turnover')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Annual Turnover</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 px-3.5 min-w-[210px] font-semibold cursor-pointer hover:text-blue-700 transition-colors"
                    onClick={() => handleSortToggle('status')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[150px] font-semibold text-slate-600">Contact Person</th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[155px] font-semibold text-slate-600">Phone Number</th>
                  <th scope="col" className="py-2.5 px-3.5 min-w-[180px] font-semibold text-slate-600">Email</th>
                  <th scope="col" className="py-2.5 px-4 min-w-[150px] font-semibold text-center text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {records.length > 0 ? (
                  records.map((lead) => {
                    const cat = getHotLeadCategory(lead.crmStatus);
                    const hasContact = hasHotLeadContact(lead);
                    const initials = lead.customerName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase();
                    const phoneData = formatPhoneNumber(lead.phone);
                    const contactName =
                      lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-'
                        ? lead.apolloDecisionMaker
                        : lead.contactPerson && lead.contactPerson !== '-'
                        ? lead.contactPerson
                        : null;
                    const contactTitle =
                      lead.apolloDecisionMaker && lead.apolloDecisionMaker !== '-'
                        ? lead.decisionMakerTitle && lead.decisionMakerTitle !== '-'
                          ? lead.decisionMakerTitle
                          : 'Decision Maker'
                        : lead.contactPerson && lead.contactPerson !== '-'
                        ? 'JFLL Contact'
                        : null;
                    const leadEmail =
                      lead.decisionMakerEmail && lead.decisionMakerEmail !== '-'
                        ? lead.decisionMakerEmail
                        : lead.email && lead.email !== '-'
                        ? lead.email
                        : null;

                    return (
                      <tr
                        key={lead.srNo}
                        onClick={() => handleRowClick(lead)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-500 text-xs">
                          {lead.srNo}
                        </td>
                        <td className="min-w-[220px] py-3 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 shadow-2xs">
                              {initials || <Building2 className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-xs text-slate-900 group-hover:text-blue-700 transition-colors truncate max-w-[220px] lg:max-w-[320px]">
                                {lead.customerName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5 flex items-center gap-1.5 flex-wrap">
                                {(() => {
                                  const tracked = getTrackedLeadByCompanyOrId(lead.customerName, lead.srNo);
                                  const effectiveRep = (tracked && tracked.assigned_to) || (lead.salesRep && lead.salesRep !== '-' ? lead.salesRep : null);
                                  return effectiveRep ? (
                                    <AssignedBadge
                                      assignedTo={effectiveRep}
                                      branch={tracked?.branch}
                                    />
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200/80">
                                      Unassigned
                                    </span>
                                  );
                                })()}
                                {lead.datamyneTradeActivity && lead.datamyneTradeActivity !== '-' && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 truncate max-w-[140px]" title={lead.datamyneTradeActivity}>
                                      {lead.datamyneTradeActivity}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{lead.region || 'Delhi NCR'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap text-right font-mono tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {formatInrCurrency(lead.taxableTurnover)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5 text-right">
                              ₹{lead.taxableTurnover.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {cat === 'active' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                JFLL Active
                              </span>
                            )}
                            {cat === 'inactive' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                JFLL Inactive
                              </span>
                            )}
                            {cat === 'fresh' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Fresh Data
                              </span>
                            )}

                            {hasContact ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                With Contacts
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap shrink-0">
                                Without Contacts
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-middle">
                          {editingCell?.srNo === lead.srNo && editingCell?.field === 'contactPerson' ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="text"
                                value={editingCell.value}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit(lead);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                placeholder="Contact name"
                                className="w-32 px-2 py-1 text-xs bg-white border border-blue-500 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                disabled={isSavingCell}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(lead)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                title="Save to database (Enter)"
                                aria-label="Save contact person"
                              >
                                {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                                title="Cancel (Esc)"
                                aria-label="Cancel contact edit"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : contactName ? (
                            <div className="group/cell flex items-center justify-between gap-1">
                              <div className="min-w-0">
                                <span className="text-xs text-slate-900 font-semibold truncate max-w-[130px] block leading-tight">
                                  {contactName}
                                </span>
                                {contactTitle && (
                                  <span className="text-[11px] text-slate-500 truncate max-w-[130px] block leading-tight mt-0.5" title={contactTitle}>
                                    {contactTitle}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({
                                    srNo: lead.srNo,
                                    field: 'contactPerson',
                                    value: lead.contactPerson && lead.contactPerson !== '-' ? lead.contactPerson : '',
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover/cell:opacity-100 focus:opacity-100 transition-opacity cursor-pointer shrink-0"
                                title="Edit contact person (persists to DB)"
                                aria-label={`Edit contact person for ${lead.customerName}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({
                                  srNo: lead.srNo,
                                  field: 'contactPerson',
                                  value: '',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors shadow-2xs cursor-pointer group/add"
                              title="Add contact person (persists to DB)"
                              aria-label={`Add contact person for ${lead.customerName}`}
                            >
                              <Plus className="w-3 h-3 text-slate-400 group-hover/add:text-blue-600" />
                              <span>Add Contact</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                          {editingCell?.srNo === lead.srNo && editingCell?.field === 'phone' ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="text"
                                value={editingCell.value}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit(lead);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                placeholder="+91 98765 43210"
                                className="w-32 px-2 py-1 text-xs font-mono bg-white border border-blue-500 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                disabled={isSavingCell}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(lead)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                title="Save to database (Enter)"
                                aria-label="Save phone number"
                              >
                                {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                                title="Cancel (Esc)"
                                aria-label="Cancel phone edit"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : phoneData ? (
                            <div className="flex items-center gap-1.5 text-slate-800 group/cell">
                              <IndiaFlagIcon className="w-4 h-3 shrink-0" />
                              <a
                                href={`tel:${phoneData.raw}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-xs text-slate-800 hover:text-blue-700 hover:underline font-medium leading-tight"
                              >
                                {phoneData.number}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(phoneData.raw, `phone-${lead.srNo}`, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-100 sm:opacity-0 sm:group-hover/cell:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Copy phone"
                                aria-label={`Copy phone number ${phoneData.number}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({
                                    srNo: lead.srNo,
                                    field: 'phone',
                                    value: lead.phone && lead.phone !== '-' ? lead.phone : '',
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-100 sm:opacity-0 sm:group-hover/cell:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Edit phone number (persists to DB)"
                                aria-label={`Edit phone number for ${lead.customerName}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              {lead.isCustomContact && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Updated by sales coordinator (persisted in DB)" />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({
                                  srNo: lead.srNo,
                                  field: 'phone',
                                  value: '',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 transition-colors shadow-2xs cursor-pointer group/add"
                              title="Add missing contact number (persists to DB)"
                              aria-label={`Add phone number for ${lead.customerName}`}
                            >
                              <Plus className="w-3 h-3 text-blue-600 group-hover/add:scale-110 transition-transform" />
                              <span>Add Phone</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-3.5 align-middle">
                          {editingCell?.srNo === lead.srNo && editingCell?.field === 'email' ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                type="email"
                                value={editingCell.value}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineEdit(lead);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                placeholder="email@company.com"
                                className="w-36 px-2 py-1 text-xs bg-white border border-blue-500 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                disabled={isSavingCell}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlineEdit(lead)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
                                title="Save to database (Enter)"
                                aria-label="Save email"
                              >
                                {isSavingCell ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                disabled={isSavingCell}
                                className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                                title="Cancel (Esc)"
                                aria-label="Cancel email edit"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : leadEmail ? (
                            <div className="flex items-center gap-1.5 text-slate-700 group/cell">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a
                                href={`mailto:${leadEmail}`}
                                onClick={(e) => e.stopPropagation()}
                                className="truncate max-w-[150px] text-xs text-slate-700 font-normal hover:text-blue-700 hover:underline leading-tight"
                                title={leadEmail}
                              >
                                {leadEmail}
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(leadEmail, `email-${lead.srNo}`, e)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-100 sm:opacity-0 sm:group-hover/cell:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Copy email"
                                aria-label={`Copy email ${leadEmail}`}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCell({
                                    srNo: lead.srNo,
                                    field: 'email',
                                    value: lead.email && lead.email !== '-' ? lead.email : '',
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-100 sm:opacity-0 sm:group-hover/cell:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="Edit email (persists to DB)"
                                aria-label={`Edit email for ${lead.customerName}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell({
                                  srNo: lead.srNo,
                                  field: 'email',
                                  value: '',
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors shadow-2xs cursor-pointer group/add"
                              title="Add email address (persists to DB)"
                              aria-label={`Add email for ${lead.customerName}`}
                            >
                              <Plus className="w-3 h-3 text-slate-400 group-hover/add:text-blue-600" />
                              <span>Add Email</span>
                            </button>
                          )}
                        </td>
                        <td className="min-w-[150px] py-3 px-4 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRowClick(lead)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 rounded-md transition-all shadow-2xs group/btn cursor-pointer"
                              title={`View details for ${lead.customerName}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigateToReport?.(lead.customerName)}
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-2xs transition-colors cursor-pointer"
                              title="Generate Client Report"
                              aria-label={`Generate report for ${lead.customerName}`}
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onFindInApollo?.(lead.customerName)}
                              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:bg-purple-50 shadow-2xs transition-colors cursor-pointer"
                              title="Search in Apollo"
                              aria-label={`Search ${lead.customerName} in Apollo`}
                            >
                              <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                            </button>
                            {lead.datamyneTradeActivity && lead.datamyneTradeActivity !== '-' && (
                              <button
                                type="button"
                                onClick={() => onFindInDatamyne?.(lead.customerName)}
                                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:bg-blue-50 shadow-2xs transition-colors cursor-pointer"
                                title="DataMyne Shipments"
                                aria-label={`View DataMyne shipments for ${lead.customerName}`}
                              >
                                <Ship className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : activeRegionMeta.status === 'upcoming' ? (
                  <tr>
                    <td colSpan={9} className="py-12 px-6 text-center">
                      <div className="max-w-lg mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                            <Clock className="w-3 h-3" />
                            {`Scheduled Ingestion: ${activeRegionMeta.upcomingQuarter || 'Upcoming Quarter'}`}
                          </div>
                          <h3 className="text-base font-bold text-slate-900">
                            {`${activeRegionMeta.name} Sourcing Hub`}
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {activeRegionMeta.description}
                          </p>
                        </div>

                        {activeRegionMeta.gateways && activeRegionMeta.gateways.length > 0 && (
                          <div className="pt-2 border-t border-slate-200 text-left">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                              Target Trade Gateways & Logistics Hubs:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeRegionMeta.gateways.map((gw) => (
                                <span
                                  key={gw}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs"
                                >
                                  <Ship className="w-3 h-3 text-slate-400" />
                                  {gw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRegion('delhi')}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-2xs cursor-pointer"
                          >
                            View Delhi NCR Accounts (60 Active)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedRegion('all')}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-2xs cursor-pointer"
                          >
                            View All Regions
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                          <Search className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                          No matching accounts found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-xs text-slate-500">
                          Try searching by company name, sales rep, decision maker, or clear the search filter.
                        </p>
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          Clear Search Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Slide-over Drawer */}
      <HotLeadDetailDrawer
        isOpen={isDrawerOpen}
        lead={selectedLead}
        onClose={() => setIsDrawerOpen(false)}
        onNavigateToReport={onNavigateToReport}
        onFindInApollo={onFindInApollo}
        onFindInDatamyne={onFindInDatamyne}
        onLeadUpdated={(updatedLead) => {
          setSelectedLead(updatedLead);
          setRecords((prev) => {
            const next = prev.map((item) => (item.srNo === updatedLead.srNo ? updatedLead : item));
            setMetrics(computeHotLeadsMetrics(next, selectedRegion));
            return next;
          });
        }}
      />
    </div>
  );
};
