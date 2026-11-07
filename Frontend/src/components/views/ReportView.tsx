import React, { useState, useEffect, useRef } from 'react';
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
  Building,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ClientReportData, ContactItem, ReportCompanySuggestion } from '@/types/report';
import {
  fetchReportCompanySuggestions,
  generateClientReport,
  downloadClientReportDocx,
  createEmptyReportDraft,
} from '@/services/reportService';
import { UserSession } from '@/types/auth';

export interface ReportViewProps {
  initialCompany?: string | null;
  initialReport?: ClientReportData | null;
  currentUser?: UserSession | null;
}

export const ReportView: React.FC<ReportViewProps> = ({
  initialCompany = '',
  initialReport = null,
  currentUser = null,
}) => {
  const defaultPreparedBy = currentUser?.name || 'Tyra Theknath';
  const [searchQuery, setSearchQuery] = useState(initialCompany || '');
  const [preparedFor, setPreparedFor] = useState('Mumbai Sales Branch');
  const [preparedBy, setPreparedBy] = useState(defaultPreparedBy);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [suggestions, setSuggestions] = useState<ReportCompanySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [report, setReport] = useState<ClientReportData>(() => {
    if (initialReport) return initialReport;
    if (initialCompany) {
      return createEmptyReportDraft(initialCompany, preparedFor, defaultPreparedBy);
    }
    return createEmptyReportDraft('Sample Enterprise (Click Generate)', preparedFor, defaultPreparedBy);
  });

  // Fetch initial report if company was pre-selected from drawer
  useEffect(() => {
    if (initialCompany && !initialReport) {
      handleGenerate(initialCompany);
    }
  }, [initialCompany]);

  // Autocomplete search suggestions debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const items = await fetchReportCompanySuggestions(searchQuery, 8);
      setSuggestions(items);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleGenerate = async (companyNameOverride?: string) => {
    const target = companyNameOverride || searchQuery;
    if (!target || !target.trim()) return;

    setIsLoading(true);
    setShowSuggestions(false);
    try {
      const data = await generateClientReport({
        company_name_or_id: target.trim(),
        prepared_for: preparedFor,
        prepared_by: preparedBy,
      });
      setReport(data);
      setSearchQuery(data.header.company_name);
    } catch (err) {
      console.error('[REPORT VIEW] Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportDocx = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await downloadClientReportDocx(report);
    } catch (err) {
      alert('Failed to export Word document. Please ensure backend is reachable.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCopyPitch = () => {
    const text = `JFLL FIT & PITCH ANGLE FOR ${report.header.company_name.toUpperCase()}:\n\n` +
      `Cargo Fit: ${report.section_3_jfll_fit.cargo_strength}\n\n` +
      `Lead Pitch With: ${report.section_3_jfll_fit.pitch_angle}`;
    
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
      const nextContacts = [...prev.section_4_contacts];
      nextContacts[idx] = { ...nextContacts[idx], [key]: val };
      return { ...prev, section_4_contacts: nextContacts };
    });
  };

  const addContactRow = () => {
    setReport((prev) => ({
      ...prev,
      section_4_contacts: [
        ...prev.section_4_contacts,
        {
          name: '',
          designation: 'Supply Chain / Logistics',
          contact_info: '',
          notes: 'Logistics Decision-Maker',
        },
      ],
    }));
  };

  const removeContactRow = (idx: number) => {
    setReport((prev) => {
      const nextContacts = prev.section_4_contacts.filter((_, i) => i !== idx);
      return { ...prev, section_4_contacts: nextContacts };
    });
  };

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
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Client Report Generator
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60 uppercase">
                  Phase 2 Feature
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                1-Click executive prospect briefings combining customs shipment history, regulatory research & JFLL fit.
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyPitch}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Copy pitch angles to clipboard"
            >
              {copiedPitch ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch'}</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Print document or save as PDF"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Exporting...' : 'Export Word (.docx)'}</span>
            </button>
          </div>
        </div>

        {/* Company Search and Metadata Selectors */}
        <div className="max-w-6xl mx-auto mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6 relative">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select or Search Prospect Company
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Search company in DataMyne or enter name (e.g. Titan Laboratories)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg text-xs font-medium text-slate-900 transition-colors"
              />
              {isLoading && (
                <RefreshCw className="w-4 h-4 absolute right-3 top-2.5 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSearchQuery(item.company_name);
                      handleGenerate(item.company_name);
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                        {item.company_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.city || 'India'}</span>
                        {item.category && <span>· {item.category}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-900">
                        {item.total_shipments} shipments
                      </div>
                      <div className="text-[10px] text-emerald-600 font-medium">
                        ${item.total_value_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Prepared For (Sales Rep / Branch)
            </label>
            <input
              type="text"
              value={preparedFor}
              onChange={(e) => setPreparedFor(e.target.value)}
              placeholder="e.g. Sweety / Mumbai Branch"
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Prepared By
              </label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-xs text-slate-800"
              />
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isLoading || !searchQuery.trim()}
              className="mt-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Document Canvas (Print Friendly) */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-white border border-slate-300 rounded-xl shadow-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:max-w-full">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-200 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-blue-700">
                CLIENT REPORT  ·  PROSPECT BRIEF
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Jet Freight Logistics Master Brief
              </span>
            </div>

            <input
              type="text"
              value={report.header.company_name}
              onChange={(e) =>
                setReport((prev) => ({
                  ...prev,
                  header: { ...prev.header, company_name: e.target.value },
                }))
              }
              className="mt-2 w-full text-2xl sm:text-3xl font-extrabold text-blue-950 uppercase tracking-tight bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1 -mx-1 transition-colors"
            />

            <input
              type="text"
              value={report.header.subtitle}
              onChange={(e) =>
                setReport((prev) => ({
                  ...prev,
                  header: { ...prev.header, subtitle: e.target.value },
                }))
              }
              className="mt-1 w-full text-sm italic text-slate-600 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1 -mx-1"
            />

            {/* Metadata Strip */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
              <div>
                <strong className="text-slate-500 font-semibold">Prepared for: </strong>
                <span className="italic">{report.header.prepared_for}</span>
              </div>
              <div>
                <strong className="text-slate-500 font-semibold">Prepared by: </strong>
                <span className="italic">{report.header.prepared_by}</span>
              </div>
              <div>
                <strong className="text-slate-500 font-semibold">Date: </strong>
                <span className="italic">{report.header.date}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Company Background */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>1 · Company Background</span>
            </h2>
            <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  What they do / product lines
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={2}
                    value={report.section_1_background.what_they_do}
                    onChange={(e) => updateSection1('what_they_do', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  HQ & key facilities
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={2}
                    value={report.section_1_background.hq_facilities}
                    onChange={(e) => updateSection1('hq_facilities', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Export markets
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={1}
                    value={report.section_1_background.export_markets}
                    onChange={(e) => updateSection1('export_markets', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Scale / credibility
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={2}
                    value={report.section_1_background.scale_credibility}
                    onChange={(e) => updateSection1('scale_credibility', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Trade Lane & Commodity */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2 · Trade Lane & Commodity</span>
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {report.section_2_trade_lane.total_shipments} shipments · ${report.section_2_trade_lane.total_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </div>
            </h2>
            <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Origin → Destination
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <input
                    type="text"
                    value={report.section_2_trade_lane.origin_destination}
                    onChange={(e) => updateSection2('origin_destination', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Commodity / cargo type
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <input
                    type="text"
                    value={report.section_2_trade_lane.commodity}
                    onChange={(e) => updateSection2('commodity', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Primary mode: Ocean / Air
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <input
                    type="text"
                    value={report.section_2_trade_lane.primary_mode}
                    onChange={(e) => updateSection2('primary_mode', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-slate-50/80 font-bold text-slate-700 border-r border-slate-200">
                  Special handling
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={2}
                    value={report.section_2_trade_lane.special_handling}
                    onChange={(e) => updateSection2('special_handling', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: JFLL Fit — Why Us */}
          <section className="mb-8">
            <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2">
              3 · JFLL Fit — Why Us
            </h2>
            <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-blue-50/60 font-bold text-blue-900 border-r border-slate-200">
                  Cargo → JFLL strength
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={3}
                    value={report.section_3_jfll_fit.cargo_strength}
                    onChange={(e) => updateSection3('cargo_strength', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 bg-white">
                <div className="sm:col-span-4 p-2.5 bg-blue-50/60 font-bold text-blue-900 border-r border-slate-200">
                  Lead the pitch with
                </div>
                <div className="sm:col-span-8 p-1.5">
                  <textarea
                    rows={3}
                    value={report.section_3_jfll_fit.pitch_angle}
                    onChange={(e) => updateSection3('pitch_angle', e.target.value)}
                    className="w-full p-1 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 rounded resize-none text-slate-800"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Decision-Makers / Logistics Contacts */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wider">
                4 · Decision-Makers / Logistics Contacts
              </h2>
              <button
                onClick={addContactRow}
                className="print:hidden inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Contact</span>
              </button>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700">
                    <th className="p-2.5 text-left font-bold w-1/4">Name</th>
                    <th className="p-2.5 text-left font-bold w-1/4">Designation / Role</th>
                    <th className="p-2.5 text-left font-bold w-1/4">Contact Information</th>
                    <th className="p-2.5 text-left font-bold w-1/4">Notes / Context</th>
                    <th className="p-2.5 text-center font-bold w-10 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {report.section_4_contacts.map((contact, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(idx, 'name', e.target.value)}
                          placeholder="Contact Name..."
                          className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-900 font-semibold"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={contact.designation}
                          onChange={(e) => updateContact(idx, 'designation', e.target.value)}
                          placeholder="Role (e.g. Logistics Head)"
                          className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-800"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={contact.contact_info}
                          onChange={(e) => updateContact(idx, 'contact_info', e.target.value)}
                          placeholder="email@company.com / +91..."
                          className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-800"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={contact.notes}
                          onChange={(e) => updateContact(idx, 'notes', e.target.value)}
                          placeholder="Context or phone..."
                          className="w-full p-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 rounded text-slate-600"
                        />
                      </td>
                      <td className="p-1.5 text-center print:hidden">
                        {report.section_4_contacts.length > 1 && (
                          <button
                            onClick={() => removeContactRow(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer transition-colors"
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
          </section>
        </div>
      </main>
    </div>
  );
};
export default ReportView;
