import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  X,
  Globe,
  Loader2,
  UserCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ClientReportData, ClientReportExportPayload, ContactItem, ReportCompanySuggestion } from '@/types/report';
import {
  fetchReportCompanySuggestions,
  generateClientReport,
  downloadClientReportDocx,
  createEmptyReportDraft,
  enrichClientReportWithWeb,
  saveDraftToSession,
  loadDraftFromSession,
} from '@/services/reportService';
import { UserSession } from '@/types/auth';

export interface ReportViewProps {
  initialCompany?: string | null;
  initialLeadId?: string | null;
  initialSource?: string | null;
  initialReport?: ClientReportData | null;
  currentUser?: UserSession | null;
  initialIsLoading?: boolean;
}

interface ReportFieldRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  highlightLabel?: boolean;
  valueFontMedium?: boolean;
  subnote?: string;
}

const ReportFieldRow: React.FC<ReportFieldRowProps> = ({
  id,
  label,
  value,
  onChange,
  multiline = true,
  rows = 2,
  highlightLabel = false,
  valueFontMedium = false,
  subnote,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-12 bg-white print:grid-cols-12">
    <label
      htmlFor={id}
      className={`sm:col-span-4 p-2.5 font-bold border-r border-slate-200 select-none cursor-pointer print:col-span-4 ${
        highlightLabel ? 'bg-blue-50/60 text-blue-900' : 'bg-slate-50/80 text-slate-700'
      }`}
    >
      <span>{label}</span>
      {subnote && (
        <span className="block text-[10px] text-slate-500 font-normal mt-0.5">{subnote}</span>
      )}
    </label>
    <div className="sm:col-span-8 p-1.5 print:col-span-8">
      {multiline ? (
        <>
          <textarea
            id={id}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded resize-none text-slate-800 transition-colors print:hidden ${
              valueFontMedium ? 'font-medium' : ''
            }`}
          />
          <div
            className={`hidden print:block w-full p-1 text-slate-800 whitespace-pre-wrap ${
              valueFontMedium ? 'font-medium' : ''
            }`}
          >
            {value || <span className="italic text-slate-400 font-normal">[ Pending notes ]</span>}
          </div>
        </>
      ) : (
        <>
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-800 transition-colors print:hidden"
          />
          <div className="hidden print:block w-full p-1 text-slate-800">
            {value || <span className="italic text-slate-400">[ Not specified ]</span>}
          </div>
        </>
      )}
    </div>
  </div>
);

export const ReportView: React.FC<ReportViewProps> = ({
  initialCompany = '',
  initialLeadId = null,
  initialSource = null,
  initialReport = null,
  currentUser = null,
  initialIsLoading = false,
}) => {
  const defaultPreparedBy = currentUser?.name || 'Tyra Theknath';
  const isViewer = currentUser?.role === 'Viewer';
  const [searchQuery, setSearchQuery] = useState(initialCompany || '');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId);
  const [selectedSource, setSelectedSource] = useState<string | null>(initialSource);
  const [preparedFor, setPreparedFor] = useState('Mumbai Sales Branch');
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  const [isExporting, setIsExporting] = useState(false);
  const [isEnrichingWeb, setIsEnrichingWeb] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReportCompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [removedSections, setRemovedSections] = useState<Set<number>>(new Set());
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<ClientReportData>(() => {
    if (initialReport) return initialReport;
    if (initialCompany) {
      const cached = loadDraftFromSession(initialCompany);
      if (cached) return cached;
      return createEmptyReportDraft(initialCompany, preparedFor, defaultPreparedBy);
    }
    return createEmptyReportDraft('Sample Enterprise (Click Generate)', preparedFor, defaultPreparedBy);
  });

  // Auto-persist draft changes to sessionStorage
  useEffect(() => {
    if (report && report.header.company_name) {
      saveDraftToSession(report);
    }
  }, [report]);

  // Fetch initial report if company was pre-selected from drawer
  useEffect(() => {
    if (initialCompany && !initialReport) {
      handleGenerate(initialCompany, initialLeadId || undefined, initialSource || undefined);
    }
  }, [initialCompany, initialLeadId, initialSource]);

  // Autocomplete search suggestions debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      const items = await fetchReportCompanySuggestions(searchQuery, 8);
      setSuggestions(items);
      setHighlightedIndex(-1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleGenerate = async (
    companyNameOverride?: string,
    leadIdOverride?: string | null,
    sourceOverride?: string | null,
  ) => {
    const target = companyNameOverride || searchQuery;
    if (!target || !target.trim()) return;

    const leadIdToSend = leadIdOverride !== undefined ? leadIdOverride : selectedLeadId;
    const sourceToSend = sourceOverride !== undefined ? sourceOverride : selectedSource;

    setIsLoading(true);
    setShowSuggestions(false);
    setErrorMessage(null);
    setRemovedSections(new Set());
    try {
      const data = await generateClientReport({
        company_name_or_id: target.trim(),
        lead_id: leadIdToSend || null,
        source: sourceToSend || null,
        prepared_for: preparedFor,
        prepared_by: preparedBy,
      });
      setReport(data);
      setSearchQuery(data.header.company_name);
      if (data.lead_id) {
        setSelectedLeadId(data.lead_id);
      }
    } catch (err) {
      console.error('[REPORT VIEW] Generation error:', err);
      setReport(createEmptyReportDraft(target.trim(), preparedFor, preparedBy));
      const message = err instanceof Error ? err.message : 'Unable to connect to live customs server.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSection = (secNum: number) => {
    setRemovedSections((prev) => new Set([...prev, secNum]));
  };

  const handleRestoreSection = (secNum: number) => {
    setRemovedSections((prev) => {
      const next = new Set(prev);
      next.delete(secNum);
      return next;
    });
  };

  const handleExportDocx = async () => {
    if (!report) return;
    setIsExporting(true);
    setErrorMessage(null);
    try {
      // Exclude user-deleted sections from exported Word document
      const exportPayload: ClientReportExportPayload = {
        ...report,
        section_1_background: removedSections.has(1) ? null : report.section_1_background,
        section_2_trade_lane: removedSections.has(2) ? null : report.section_2_trade_lane,
        section_3_jfll_fit: removedSections.has(3) ? null : report.section_3_jfll_fit,
        section_4_contacts: removedSections.has(4) ? null : report.section_4_contacts,
        section_5_feedback: removedSections.has(5) ? null : report.section_5_feedback,
      };
      await downloadClientReportDocx(exportPayload);
    } catch (err) {
      console.error('[REPORT VIEW] Export error:', err);
      const message = err instanceof Error ? err.message : 'Failed to export Word document.';
      setErrorMessage(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEnrichWeb = async () => {
    if (!report) return;
    setIsEnrichingWeb(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    try {
      const enriched = await enrichClientReportWithWeb(report);
      setReport(enriched);
      if (enriched.header.web_grounded) {
        setSuccessNotice('Report enriched with live web research via Gemini 3.8 Flash.');
        setTimeout(() => setSuccessNotice(null), 6000);
      } else {
        setErrorMessage('Live web research is unavailable or unconfigured. Local report retained.');
      }
    } catch (err) {
      console.error('[REPORT VIEW] Web enrichment error:', err);
      const message = err instanceof Error ? err.message : 'Web enrichment service is currently unreachable.';
      setErrorMessage(message);
    } finally {
      setIsEnrichingWeb(false);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyPitch = () => {
    const text = `JFLL FIT & PITCH ANGLE FOR ${report.header.company_name.toUpperCase()}:\n\n` +
      `Cargo Fit: ${report.section_3_jfll_fit?.cargo_strength || 'N/A'}\n\n` +
      `Lead Pitch With: ${report.section_3_jfll_fit?.pitch_angle || 'N/A'}`;
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  // State mutators for live inline editing
  const updateSection1 = (key: keyof ClientReportData['section_1_background'], val: string) => {
    setReport((prev) => ({
      ...prev,
      section_1_background: { ...prev.section_1_background, [key]: val },
    }));
  };

  const updateSection2 = (key: keyof ClientReportData['section_2_trade_lane'], val: any) => {
    setReport((prev) => ({
      ...prev,
      section_2_trade_lane: { ...prev.section_2_trade_lane, [key]: val },
    }));
  };

  const updateSection3 = (key: keyof ClientReportData['section_3_jfll_fit'], val: string) => {
    setReport((prev) => ({
      ...prev,
      section_3_jfll_fit: { ...prev.section_3_jfll_fit, [key]: val },
    }));
  };

  const updateContact = (idx: number, key: keyof ContactItem, val: string) => {
    setReport((prev) => {
      const nextContacts = [...(prev.section_4_contacts || [])];
      const current = nextContacts[idx] || { name: '', designation: '', notes: '' };
      const updated: ContactItem = { ...current, [key]: val, is_manually_edited: true };
      const phone = key === 'phone' ? val : (updated.phone || '');
      const email = key === 'email' ? val : (updated.email || '');
      updated.contact_info = (phone && email ? `${phone} | ${email}` : (phone || email || ''));
      nextContacts[idx] = updated;
      return { ...prev, section_4_contacts: nextContacts };
    });
  };

  const addContactRow = () => {
    setReport((prev) => ({
      ...prev,
      section_4_contacts: [
        {
          name: '',
          designation: 'Supply Chain / Logistics',
          phone: '',
          email: '',
          contact_info: '',
          notes: 'Logistics Decision-Maker',
          is_manually_edited: true,
        },
        ...(prev.section_4_contacts || []),
      ],
    }));
  };

  const removeContactRow = (idx: number) => {
    setReport((prev) => {
      const nextContacts = (prev.section_4_contacts || []).filter((_, i) => i !== idx);
      return { ...prev, section_4_contacts: nextContacts };
    });
  };

  const moveContact = (idx: number, direction: 'up' | 'down') => {
    setReport((prev) => {
      const list = [...(prev.section_4_contacts || [])];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const [moved] = list.splice(idx, 1);
      list.splice(targetIdx, 0, moved);
      return { ...prev, section_4_contacts: list };
    });
  };

  const updateFeedback = (field: keyof ClientReportData['section_5_feedback'], val: string) => {
    setReport((prev) => ({
      ...prev,
      section_5_feedback: {
        ...prev.section_5_feedback,
        [field]: val,
      },
    }));
  };

  const handleCopyFeedback = async () => {
    const f = report.section_5_feedback;
    const text = [
      `Sales Feedback for ${report.header.company_name}:`,
      `• Meeting Takeaways: ${f?.meeting_takeaways || 'N/A'}`,
      `• Preferred Carriers: ${f?.preferred_carriers || 'N/A'}`,
      `• Target Rates / Pricing: ${f?.target_pricing || 'N/A'}`,
      `• Next Action & Follow-up: ${f?.next_action_followup || 'N/A'}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2500);
    } catch {
      // Ignore clipboard write exceptions
    }
  };

  const verifiedContacts = useMemo(() => {
    return (report.section_4_contacts || []).filter(
      (c) =>
        Boolean(c.is_manually_edited) ||
        (Boolean(c.phone && c.phone.trim() !== '') &&
          !c.name.includes('Customs Filing') &&
          !c.name.includes('Corporate Office') &&
          !c.name.includes('Switchboard'))
    );
  }, [report.section_4_contacts]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 overflow-y-auto">
      {/* 1. Header Toolbar (Hidden on Print) */}
      <header className="bg-white border-b border-slate-200/90 px-6 py-4 shrink-0 shadow-2xs print:hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Client Report Generator
              </h1>
              <p className="text-xs text-slate-600">
                Executive prospect briefings with shipment history and account intelligence.
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleEnrichWeb}
              disabled={isEnrichingWeb || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enrich company background and contacts with web search"
            >
              {isEnrichingWeb ? (
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 text-blue-600" />
              )}
              <span>{isEnrichingWeb ? 'Searching Web...' : 'Enrich with Gemini (Web)'}</span>
            </button>

            <button
              onClick={handleCopyPitch}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Copy pitch angles to clipboard"
            >
              {copiedPitch ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch'}</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print / Save PDF</span>
            </button>

            {isViewer && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold"
                title="Viewing Mode · Contact Admin for Export Privileges"
              >
                Viewing Mode · Contact Admin for Export Privileges
              </span>
            )}

            <button
              onClick={handleExportDocx}
              disabled={isExporting || isViewer}
              className={`inline-flex items-center gap-2 px-4 py-2 ${
                isViewer
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-75 border border-slate-300'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer shadow-xs hover:shadow'
              } rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              title={isViewer ? 'Viewing Mode · Contact Admin for Export Privileges' : undefined}
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export Word (.docx)'}</span>
            </button>
          </div>
        </div>

        {/* Company Search and Metadata Selectors */}
        <div className="max-w-6xl mx-auto mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div
            ref={searchContainerRef}
            className="md:col-span-6 relative"
            role="combobox"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-haspopup="listbox"
          >
            <label htmlFor="company-search-input" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select or Search Prospect Company
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                id="company-search-input"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="company-suggestions-list"
                aria-activedescendant={
                  highlightedIndex >= 0 && suggestions[highlightedIndex]
                    ? `suggestion-option-${suggestions[highlightedIndex].source || 'dm'}-${suggestions[highlightedIndex].id}`
                    : undefined
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedLeadId(null);
                  setSelectedSource(null);
                  setShowSuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (showSuggestions && suggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                        const selected = suggestions[highlightedIndex];
                        setSearchQuery(selected.company_name);
                        setSelectedLeadId(selected.id);
                        setSelectedSource(selected.source || null);
                        handleGenerate(selected.company_name, selected.id, selected.source || null);
                        return;
                      }
                      handleGenerate();
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowSuggestions(false);
                      setHighlightedIndex(-1);
                      return;
                    }
                  } else if (e.key === 'Enter') {
                    handleGenerate();
                  }
                }}
                placeholder="Search company name (e.g. Titan Laboratories)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-lg text-xs font-medium text-slate-900 transition-colors"
                autoComplete="off"
              />
              {isLoading && (
                <RefreshCw className="w-4 h-4 absolute right-3 top-2.5 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                role="listbox"
                id="company-suggestions-list"
                aria-label="Company Suggestions"
                className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100"
              >
                {suggestions.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  const optionId = `suggestion-option-${item.source || 'dm'}-${item.id}`;
                  return (
                    <button
                      key={`${item.source || 'dm'}-${item.id}`}
                      id={optionId}
                      role="option"
                      type="button"
                      aria-selected={isHighlighted || searchQuery === item.company_name}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => {
                        setSearchQuery(item.company_name);
                        setSelectedLeadId(item.id);
                        setSelectedSource(item.source || null);
                        handleGenerate(item.company_name, item.id, item.source || null);
                      }}
                      className={`w-full px-3.5 py-2.5 text-left transition-colors flex items-center justify-between group cursor-pointer focus:outline-none ${
                        isHighlighted
                          ? 'bg-blue-50 text-blue-900 ring-1 ring-inset ring-blue-300'
                          : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate ${isHighlighted ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-700'}`}>
                            {item.company_name}
                          </span>
                          {item.source === 'datamyne_brazil' ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                              Brazil Customs
                            </span>
                          ) : item.source === 'apollo' ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                              Apollo Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-300">
                              DataMyne · India
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{item.city || item.country || 'Global'}</span>
                          {item.country && item.city && <span>({item.country})</span>}
                          {item.category && <span>· {item.category}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {item.source === 'apollo' ? (
                          <>
                            <div className="text-xs font-semibold text-slate-900">
                              {item.employee_count ? `${item.employee_count.toLocaleString()} emp` : 'Global Account'}
                            </div>
                            {item.total_value_usd > 0 && (
                              <div className="text-[10px] text-emerald-700 font-medium">
                                ${item.total_value_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-semibold text-slate-900">
                              {item.total_shipments} shipments
                            </div>
                            <div className="text-[10px] text-emerald-700 font-medium">
                              ${item.total_value_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-3">
            <label htmlFor="prepared-for-input" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Prepared For (Sales Rep / Branch)
            </label>
            <input
              id="prepared-for-input"
              type="text"
              value={preparedFor}
              onChange={(e) => {
                const val = e.target.value;
                setPreparedFor(val);
                setReport((prev) => ({
                  ...prev,
                  header: { ...prev.header, prepared_for: val },
                }));
              }}
              placeholder="e.g. Sweety / Mumbai Branch"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-lg text-xs text-slate-800 transition-colors"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="prepared-by-input" className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Prepared By
              </label>
              <input
                id="prepared-by-input"
                type="text"
                value={preparedBy}
                onChange={(e) => {
                  const val = e.target.value;
                  setPreparedBy(val);
                  setReport((prev) => ({
                    ...prev,
                    header: { ...prev.header, prepared_by: val },
                  }));
                }}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded-lg text-xs text-slate-800 transition-colors"
              />
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isLoading || !searchQuery.trim()}
              className="mt-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dismissible Error Notice Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center justify-between text-xs text-red-800 print:hidden animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-3">
            {(errorMessage.toLowerCase().includes('sign in') || errorMessage.toLowerCase().includes('session')) && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('leadforge:session-superseded'));
                }}
                className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium underline text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400"
              >
                Sign In Again
              </button>
            )}
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:bg-red-100 rounded text-red-600 hover:text-red-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Dismiss notice"
              title="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Dismissible Success Notice Banner */}
      {successNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800 print:hidden animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="p-1 hover:bg-emerald-100 rounded text-emerald-600 hover:text-emerald-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Dismiss notice"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Document Canvas (Print Friendly) */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 rounded-xl shadow-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:max-w-full print:m-0">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-200 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/jfll-logo.jpeg"
                  alt="Jet Freight Logistics Ltd"
                  className="w-10 h-10 object-contain rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-blue-700 block">
                      CLIENT REPORT · PROSPECT BRIEF
                    </span>
                    {report.header.web_grounded && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        <Globe className="w-3 h-3 text-blue-600" />
                        Web Grounded · Gemini 3.8 Flash
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 block">
                    Jet Freight Logistics Ltd · BSE/NSE: JETFREIGHT · ISO 9001:2015
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Executive Briefing Canvas
                </span>
                <span className="text-[10px] text-slate-400 block print:hidden">
                  Click any cell to edit inline
                </span>
              </div>
            </div>

            <label htmlFor="report-company-title" className="sr-only">Company Name</label>
            <input
              id="report-company-title"
              type="text"
              value={report.header.company_name}
              onChange={(e) =>
                setReport((prev) => ({
                  ...prev,
                  header: { ...prev.header, company_name: e.target.value },
                }))
              }
              className="mt-3 w-full text-2xl sm:text-3xl font-extrabold text-blue-950 uppercase tracking-tight bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded px-1 -mx-1 transition-colors print:hidden"
            />
            <div className="hidden print:block mt-3 text-2xl font-extrabold text-blue-950 uppercase tracking-tight">
              {report.header.company_name}
            </div>

            <label htmlFor="report-subtitle" className="sr-only">Report Subtitle</label>
            <input
              id="report-subtitle"
              type="text"
              value={report.header.subtitle}
              onChange={(e) =>
                setReport((prev) => ({
                  ...prev,
                  header: { ...prev.header, subtitle: e.target.value },
                }))
              }
              className="mt-1 w-full text-sm italic text-slate-600 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded px-1 -mx-1 transition-colors print:hidden"
            />
            <div className="hidden print:block mt-1 text-sm italic text-slate-600">
              {report.header.subtitle}
            </div>

            {/* Metadata Strip */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
              <div>
                <strong className="text-slate-600 font-semibold">Prepared for: </strong>
                <span className="italic">{report.header.prepared_for}</span>
              </div>
              <div>
                <strong className="text-slate-600 font-semibold">Prepared by: </strong>
                <span className="italic">{report.header.prepared_by}</span>
              </div>
              <div>
                <strong className="text-slate-600 font-semibold">Date: </strong>
                <span className="italic">{report.header.date}</span>
              </div>
            </div>
          </div>

          {/* Removed Sections Restore Toolbar */}
          {removedSections.size > 0 && (
            <div className="mb-6 p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center flex-wrap gap-2 print:hidden animate-fade-in">
              <span className="font-semibold text-slate-700">Removed from report:</span>
              {removedSections.has(1) && (
                <button
                  type="button"
                  onClick={() => handleRestoreSection(1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Restore 1 · Company Background</span>
                </button>
              )}
              {removedSections.has(2) && (
                <button
                  type="button"
                  onClick={() => handleRestoreSection(2)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Restore 2 · Trade Lane &amp; Commodity</span>
                </button>
              )}
              {removedSections.has(3) && (
                <button
                  type="button"
                  onClick={() => handleRestoreSection(3)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Restore 3 · JFLL Fit — Why Us</span>
                </button>
              )}
              {removedSections.has(4) && (
                <button
                  type="button"
                  onClick={() => handleRestoreSection(4)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Restore 4 · Decision-Makers</span>
                </button>
              )}
              {removedSections.has(5) && (
                <button
                  type="button"
                  onClick={() => handleRestoreSection(5)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-[11px] font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Restore 5 · Sales Feedback</span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Company Background */}
          {!removedSections.has(1) && report.section_1_background && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>1 · Company Background</span>
                </h2>
                <button
                  type="button"
                  onClick={() => handleRemoveSection(1)}
                  className="print:hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Remove section 1 · Company Background"
                  title="Remove section from report"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                <ReportFieldRow
                  id="sec1-what-they-do"
                  label="What they do / product lines"
                  value={report.section_1_background.what_they_do}
                  onChange={(val) => updateSection1('what_they_do', val)}
                  rows={2}
                />
                <ReportFieldRow
                  id="sec1-address"
                  label="Corporate / Registered Address"
                  value={report.section_1_background.address || ''}
                  onChange={(val) => updateSection1('address', val)}
                  rows={2}
                />
                <ReportFieldRow
                  id="sec1-hq-facilities"
                  label="HQ & key facilities"
                  value={report.section_1_background.hq_facilities}
                  onChange={(val) => updateSection1('hq_facilities', val)}
                  rows={2}
                />
                <ReportFieldRow
                  id="sec1-export-markets"
                  label="Export markets"
                  value={report.section_1_background.export_markets}
                  onChange={(val) => updateSection1('export_markets', val)}
                  rows={1}
                />
                <ReportFieldRow
                  id="sec1-scale-credibility"
                  label="Scale / credibility"
                  value={report.section_1_background.scale_credibility}
                  onChange={(val) => updateSection1('scale_credibility', val)}
                  rows={2}
                />
              </div>
            </section>
          )}

          {/* Section 2: Trade Lane & Commodity */}
          {!removedSections.has(2) && report.section_2_trade_lane && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span>2 · Trade Lane &amp; Commodity</span>
                  {(report.section_2_trade_lane.total_shipments > 0 || report.section_2_trade_lane.total_value_usd > 0) && (
                    <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {report.section_2_trade_lane.total_shipments} shipments · ${report.section_2_trade_lane.total_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </div>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => handleRemoveSection(2)}
                  className="print:hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Remove section 2 · Trade Lane & Commodity"
                  title="Remove section from report"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                <ReportFieldRow
                  id="sec2-origin-dest"
                  label="Origin → Destination"
                  value={report.section_2_trade_lane.origin_destination}
                  onChange={(val) => updateSection2('origin_destination', val)}
                  multiline={false}
                />
                <ReportFieldRow
                  id="sec2-commodity"
                  label="Commodity / cargo type"
                  value={report.section_2_trade_lane.commodity}
                  onChange={(val) => updateSection2('commodity', val)}
                  multiline={false}
                />
                <ReportFieldRow
                  id="sec2-primary-mode"
                  label="Primary mode: Ocean / Air"
                  value={report.section_2_trade_lane.primary_mode}
                  onChange={(val) => updateSection2('primary_mode', val)}
                  multiline={false}
                  subnote={report.section_2_trade_lane.lading_port ? `Gateway: ${report.section_2_trade_lane.lading_port}` : undefined}
                />
                <ReportFieldRow
                  id="sec2-special-handling"
                  label="Special handling"
                  value={report.section_2_trade_lane.special_handling}
                  onChange={(val) => updateSection2('special_handling', val)}
                  rows={2}
                />
              </div>
            </section>
          )}

          {/* Section 3: JFLL Fit — Why Us */}
          {!removedSections.has(3) && report.section_3_jfll_fit && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
                  3 · JFLL Fit — Why Us
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPitch}
                    className="print:hidden inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Copy pitch angle to clipboard"
                  >
                    {copiedPitch ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(3)}
                    className="print:hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Remove section 3 · JFLL Fit — Why Us"
                    title="Remove section from report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                <ReportFieldRow
                  id="sec3-cargo-strength"
                  label="Cargo → JFLL strength"
                  value={report.section_3_jfll_fit.cargo_strength}
                  onChange={(val) => updateSection3('cargo_strength', val)}
                  rows={3}
                  highlightLabel
                  valueFontMedium
                />
                <ReportFieldRow
                  id="sec3-pitch-angle"
                  label="Lead the pitch with"
                  value={report.section_3_jfll_fit.pitch_angle}
                  onChange={(val) => updateSection3('pitch_angle', val)}
                  rows={3}
                  highlightLabel
                />
              </div>
            </section>
          )}

          {/* Section 4: Decision-Makers / Logistics Contacts */}
          {!removedSections.has(4) && report.section_4_contacts && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2.5 flex-wrap">
                  <span>4 · Decision-Makers / Logistics Contacts</span>
                  {verifiedContacts.length > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 normal-case tracking-normal">
                      <UserCheck className="w-3 h-3 text-emerald-700" />
                      <span>{`${verifiedContacts.length} Sales Verified`}</span>
                    </span>
                  )}
                  {isLoading && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1.5 normal-case tracking-normal animate-pulse">
                      <Loader2 className="w-3 h-3 text-blue-600 animate-spin shrink-0" />
                      <span>Checking from Apollo…</span>
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2">
                  {!isLoading && (
                    <button
                      onClick={addContactRow}
                      className="print:hidden inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Contact</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(4)}
                    className="print:hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Remove section 4 · Decision-Makers / Logistics Contacts"
                    title="Remove section from report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-slate-50 border border-blue-200/80 rounded-lg flex flex-col items-center justify-center text-center space-y-2.5 py-10 animate-fade-in shadow-2xs">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shadow-2xs border border-blue-200">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                    </span>
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <div className="text-xs font-bold text-slate-900 tracking-tight">
                      Checking from Apollo…
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Cross-referencing verified CXOs, Directors, and Logistics Decision-Makers from Apollo and customs filings...
                    </p>
                  </div>
                  <div className="w-36 bg-slate-200/80 rounded-full h-1 overflow-hidden mt-1">
                    <div className="bg-blue-600 h-full rounded-full w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="border border-slate-300 rounded-lg overflow-hidden text-xs animate-fade-in">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700">
                        <th className="p-2.5 text-center font-bold w-16" title="Approach Priority Order">Priority</th>
                        <th className="p-2.5 text-left font-bold w-[20%]">Name</th>
                        <th className="p-2.5 text-left font-bold w-[20%]">Designation / Role</th>
                        <th className="p-2.5 text-left font-bold w-[16%]">Phone</th>
                        <th className="p-2.5 text-left font-bold w-[18%]">Email ID</th>
                        <th className="p-2.5 text-left font-bold w-[16%]">Notes / Provenance</th>
                        <th className="p-2.5 text-center font-bold w-10 print:hidden">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {(report.section_4_contacts || []).map((contact, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            contact.is_manually_edited
                              ? 'bg-emerald-50/70 hover:bg-emerald-50/90 border-l-4 border-l-emerald-600'
                              : 'hover:bg-slate-50/60 even:bg-slate-50/50'
                          }`}
                        >
                          <td className="p-1.5 text-center align-middle whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className="inline-flex items-center justify-center w-6 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-300"
                                title={`Priority #${idx + 1}`}
                              >
                                #{idx + 1}
                              </span>
                              <div className="flex flex-col print:hidden">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveContact(idx, 'up')}
                                  className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="Move up priority"
                                  aria-label={`Move contact ${contact.name || idx + 1} up priority`}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === (report.section_4_contacts || []).length - 1}
                                  onClick={() => moveContact(idx, 'down')}
                                  className="p-0.5 text-slate-400 hover:text-blue-600 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                                  title="Move down priority"
                                  aria-label={`Move contact ${contact.name || idx + 1} down priority`}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-1.5">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={contact.name}
                                onChange={(e) => updateContact(idx, 'name', e.target.value)}
                                placeholder="Contact Name..."
                                aria-label={`Contact ${idx + 1} Name`}
                                className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-900 font-semibold transition-colors print:hidden"
                              />
                              {contact.is_manually_edited && (
                                <span
                                  className="shrink-0 text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded print:hidden"
                                  title="Updated by sales team"
                                >
                                  Updated
                                </span>
                              )}
                            </div>
                            <div className="hidden print:block p-1 text-slate-900 font-semibold">
                              {contact.name || '—'}
                              {contact.is_manually_edited ? ' [Updated]' : ''}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={contact.designation}
                              onChange={(e) => updateContact(idx, 'designation', e.target.value)}
                              placeholder="Role (e.g. Logistics Head)"
                              aria-label={`Contact ${idx + 1} Designation`}
                              className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-800 transition-colors print:hidden"
                            />
                            <div className="hidden print:block p-1 text-slate-800">
                              {contact.designation || '—'}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={contact.phone || ''}
                              onChange={(e) => updateContact(idx, 'phone', e.target.value)}
                              placeholder="+91..."
                              aria-label={`Contact ${idx + 1} Phone`}
                              className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-800 font-mono text-[11px] transition-colors print:hidden"
                            />
                            <div className="hidden print:block p-1 text-slate-800 font-mono text-[11px]">
                              {contact.phone || '—'}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={contact.email || ''}
                              onChange={(e) => updateContact(idx, 'email', e.target.value)}
                              placeholder="email@company.com"
                              aria-label={`Contact ${idx + 1} Email ID`}
                              className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-800 transition-colors print:hidden"
                            />
                            <div className="hidden print:block p-1 text-slate-800 truncate">
                              {contact.email || '—'}
                            </div>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={contact.notes || ''}
                              onChange={(e) => updateContact(idx, 'notes', e.target.value)}
                              placeholder="Provenance (Customs / Apollo)"
                              aria-label={`Contact ${idx + 1} Notes / Provenance`}
                              className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none rounded text-slate-600 transition-colors print:hidden"
                            />
                            <div className="hidden print:block p-1 text-slate-600">
                              {contact.notes || '—'}
                            </div>
                          </td>
                          <td className="p-1.5 text-center print:hidden">
                            {(report.section_4_contacts || []).length > 1 && (
                              <button
                                onClick={() => removeContactRow(idx)}
                                className="p-1 text-slate-500 hover:text-red-600 rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                                aria-label={`Remove contact ${contact.name || idx + 1}`}
                                title="Remove contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Section 5: Sales Executive Feedback & Action Plan */}
          {!removedSections.has(5) && report.section_5_feedback && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
                  5 · Sales Executive Feedback &amp; Action Plan
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyFeedback}
                    className="print:hidden inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md px-2.5 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Copy feedback summary to clipboard"
                  >
                    {copiedFeedback ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedFeedback ? 'Copied Feedback!' : 'Copy Feedback'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(5)}
                    className="print:hidden p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Remove section 5 · Sales Executive Feedback & Action Plan"
                    title="Remove section from report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                <ReportFieldRow
                  id="sec5-takeaways"
                  label="Meeting Takeaways & Client Needs"
                  value={report.section_5_feedback.meeting_takeaways}
                  onChange={(val) => updateFeedback('meeting_takeaways', val)}
                  rows={3}
                  multiline={true}
                  highlightLabel={true}
                />
                <ReportFieldRow
                  id="sec5-carriers"
                  label="Preferred Carriers / Lines"
                  value={report.section_5_feedback.preferred_carriers}
                  onChange={(val) => updateFeedback('preferred_carriers', val)}
                  multiline={false}
                />
                <ReportFieldRow
                  id="sec5-pricing"
                  label="Target Rates / Pricing Notes"
                  value={report.section_5_feedback.target_pricing}
                  onChange={(val) => updateFeedback('target_pricing', val)}
                  multiline={false}
                />
                <ReportFieldRow
                  id="sec5-followup"
                  label="Next Action & Follow-up Date"
                  value={report.section_5_feedback.next_action_followup}
                  onChange={(val) => updateFeedback('next_action_followup', val)}
                  multiline={false}
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
export default ReportView;
