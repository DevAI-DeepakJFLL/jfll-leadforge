import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plane,
  Ship,
  ArrowDownLeft,
  Thermometer,
  MapPin,
  Clock,
  Copy,
  Check,
  Users,
  Compass,
  FileText,
  Boxes,
} from 'lucide-react';
import {
  MonthlyRecord,
  ColdChainSpec,
  GatewayHubId,
} from '@/types/freightCommodities';
import {
  HUB_GATEWAYS,
  getColdChainSpecsByHub,
} from '@/data/freightCommoditiesData';

export interface CommodityDetailDrawerProps {
  isOpen: boolean;
  record: MonthlyRecord | null;
  onClose: () => void;
  onFindInDatamyne?: (query: string, port?: string) => void;
  onFindInApollo?: (query: string) => void;
  onNavigateToReport?: (companyName: string) => void;
}

export const CommodityDetailDrawer: React.FC<CommodityDetailDrawerProps> = ({
  isOpen,
  record,
  onClose,
  onFindInDatamyne,
  onFindInApollo,
  onNavigateToReport,
}) => {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [activeTab, setActiveTab] = useState<'playbook' | 'coldchain' | 'pitch'>('playbook');
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Clean up copy notification timer on unmount and restore focus if open
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      if (previouslyFocusedElementRef.current) {
        previouslyFocusedElementRef.current.focus?.();
        previouslyFocusedElementRef.current = null;
      }
    };
  }, []);

  // Focus restoration: Store active element on open, restore on close
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        previouslyFocusedElementRef.current = document.activeElement;
      }
    } else if (previouslyFocusedElementRef.current) {
      previouslyFocusedElementRef.current.focus?.();
      previouslyFocusedElementRef.current = null;
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const hubInfo = HUB_GATEWAYS[record.hubId as GatewayHubId] || HUB_GATEWAYS.ALL;
  const coldChainSpecs: ColdChainSpec[] = getColdChainSpecsByHub(record.hubId as GatewayHubId);

  // Generate tailored pitch copy
  const pitchSubject = `Jet Freight Logistics: Dedicated Capacity & Handling for ${record.hubName} ${record.monthName} Shipments`;
  const pitchBody = `Dear Supply Chain Team,

As the peak shipping window for ${record.season} ramps up across ${record.hubName}, securing reliable freight allocation and temperature integrity is critical.

At Jet Freight Logistics, we have locked dedicated capacities for:
• Air Outbound: ${record.airExport}
• Ocean FCL & Reefers: ${record.seaExport}
• Drayage Corridors: ${record.gateways}
• Specialized Equipment: ${record.equipment}

Given current commercial booking lead times (${record.bookingWindow}), we recommend reserving space 4-6 weeks prior to vessel/flight departure to guarantee carrier space and competitive tariff tiers.

Could we schedule a brief 10-minute briefing call this week to review your volume forecasts for ${record.tradeLanes}?

Best regards,
Commercial Trade Lane Team | Jet Freight Logistics Ltd.`;

  const handleCopyPitch = async () => {
    const textToCopy = `${pitchSubject}\n\n${pitchBody}`;
    let success = false;

    // Primary: Modern Async Clipboard API in secure contexts
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch {
        // Fall through to fallback
      }
    }

    // Defensive Fallback: Ephemeral textarea for sandboxed or legacy contexts
    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopiedPitch(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedPitch(false), 2000);
    }
  };

  const getStatusBadge = () => {
    if (record.bookingStatus === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active Booking Window
        </span>
      );
    }
    if (record.bookingStatus === 'upcoming') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          Booking Window Approaching
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
        Off-Season / Planning
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200 overscroll-contain"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`Commodity details for ${record.hubName}`}
          className="w-screen max-w-full sm:max-w-2xl bg-white shadow-2xl flex flex-col h-[100svh] max-h-[100svh] overscroll-contain border-l border-slate-200 overflow-hidden transform transition-transform duration-300 ease-out"
        >
          {/* Top Bar Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono font-bold text-xs tracking-wider">
                {record.hubId}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {record.hubName}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {record.quarter}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {record.monthName} Operational Target
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-slate-200 bg-white shrink-0">
            <div className="flex gap-6 -mb-px text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('playbook')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'playbook'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Compass className="w-4 h-4" />
                Operational Playbook
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('coldchain')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'coldchain'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Thermometer className="w-4 h-4" />
                Cold-Chain Regimes ({coldChainSpecs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pitch')}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'pitch'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Sales Pitch Script
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'playbook' && (
              <>
                {/* Seasonal Trade Driver Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/70 via-slate-50 to-white border border-blue-100/80 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {record.season}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      Priority: {record.priority}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-100/60 flex items-center gap-2 text-xs text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      <strong className="font-semibold text-slate-900">
                        Commercial Booking Lead Window:
                      </strong>{' '}
                      {record.bookingWindow}
                    </span>
                  </div>
                </div>

                {/* Four Freight Quadrants */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-slate-500" />
                    Modal Commodity Breakdown
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Air Export */}
                    <div className="p-3.5 rounded-lg bg-sky-50/50 border border-sky-100 flex items-start gap-3">
                      <div className="p-2 rounded bg-sky-100 text-sky-700 shrink-0">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sky-900">
                            Air Export (Outbound Perishables)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-200/60 text-sky-800 font-medium">
                            Outbound
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {record.airExport || 'Standard general cargo consolidation.'}
                        </p>
                      </div>
                    </div>

                    {/* Sea Export */}
                    <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                      <div className="p-2 rounded bg-emerald-100 text-emerald-700 shrink-0">
                        <Ship className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900">
                            Sea Export (FCL, LCL & Ocean Reefers)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/60 text-emerald-800 font-medium">
                            FCL / Reefer
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {record.seaExport || 'Dry containerized FCL / LCL shipments.'}
                        </p>
                      </div>
                    </div>

                    {/* Air Import */}
                    <div className="p-3.5 rounded-lg bg-amber-50/40 border border-amber-100 flex items-start gap-3">
                      <div className="p-2 rounded bg-amber-100 text-amber-800 shrink-0">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-950">
                            Air Import (High-Value Inputs & Spares)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 font-medium">
                            Inbound Air
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {record.airImport || 'High-tech components, capital inputs.'}
                        </p>
                      </div>
                    </div>

                    {/* Sea Import */}
                    <div className="p-3.5 rounded-lg bg-indigo-50/40 border border-indigo-100 flex items-start gap-3">
                      <div className="p-2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                        <ArrowDownLeft className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-950">
                            Sea Import (Raw Materials & Capital Goods)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-200/60 text-indigo-900 font-medium">
                            Inbound Sea
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {record.seaImport || 'Raw materials, heavy machinery.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics Infrastructure & Corridors */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Gateway Drayage & Target Clusters
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 block">
                        Equipment & ULD Specs:
                      </span>
                      <p className="text-slate-600 mt-0.5">{record.equipment}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">
                        Gateway Facilities (Air/Sea/ICD):
                      </span>
                      <p className="text-slate-600 mt-0.5">{record.gateways} ({hubInfo.airCargoVolume})</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">
                        Shipper Industrial Clusters:
                      </span>
                      <p className="text-slate-600 mt-0.5">{record.clusters}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700 block">
                        Primary Trade Lanes:
                      </span>
                      <p className="text-slate-600 mt-0.5">{record.tradeLanes}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'coldchain' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-900">
                  <strong className="font-semibold">Verified Cold-Chain Protocol:</strong>{' '}
                  Specialized APEDA and DGFT temperature regimes for cargo originating from {record.hubName}.
                </div>

                {coldChainSpecs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No dedicated cold-chain profiles registered for this gateway.
                  </div>
                ) : (
                  coldChainSpecs.map((spec) => (
                    <div
                      key={spec.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-bold text-slate-900">
                          {spec.commodity}
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {spec.peakWindow}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium block">
                            Temp & Humidity Regime:
                          </span>
                          <span className="font-semibold text-slate-800">
                            {spec.tempAndHumidity}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium block">
                            Commercial Lead Window:
                          </span>
                          <span className="font-semibold text-blue-700">
                            {spec.leadWindow}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1 pt-1">
                        <p>
                          <strong className="text-slate-700">Compliance:</strong>{' '}
                          {spec.compliance}
                        </p>
                        <p>
                          <strong className="text-slate-700">Ocean Solution:</strong>{' '}
                          {spec.oceanSolution}
                        </p>
                        <p>
                          <strong className="text-slate-700">Air Solution:</strong>{' '}
                          {spec.airSolution}
                        </p>
                        <p>
                          <strong className="text-slate-700">Target Buyers:</strong>{' '}
                          {spec.buyers}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'pitch' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
                  <span>
                    Auto-generated sales outreach template for <strong>{record.hubName}</strong> prospects.
                  </span>
                  <div className="flex items-center">
                    <span role="status" aria-live="polite" className="sr-only">
                      {copiedPitch ? 'Sales pitch copied to clipboard' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPitch}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all shadow-2xs ${
                        copiedPitch ? 'ring-2 ring-emerald-400/50' : ''
                      }`}
                    >
                      {copiedPitch ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-white" />
                          Copy Pitch
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-all">
                  <p className="font-bold text-slate-900 pb-2 border-b border-slate-200 mb-2">
                    Subject: {pitchSubject}
                  </p>
                  {pitchBody}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Sticky Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center">
              <span role="status" aria-live="polite" className="sr-only">
                {copiedPitch ? 'Sales pitch copied to clipboard' : ''}
              </span>
              <button
                type="button"
                onClick={handleCopyPitch}
                className={`px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300 rounded-lg transition-all flex items-center gap-1.5 ${
                  copiedPitch ? 'ring-2 ring-emerald-400/50' : ''
                }`}
              >
                {copiedPitch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Sales Pitch</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToReport && (
                <button
                  type="button"
                  onClick={() => {
                    const firstCluster = (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                    onNavigateToReport(firstCluster);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Report</span>
                </button>
              )}

              {onFindInDatamyne && (
                <button
                  type="button"
                  onClick={() => {
                    const firstCluster = (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                    onFindInDatamyne(firstCluster);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Ship className="w-3.5 h-3.5" />
                  <span>Find Shippers in DataMyne</span>
                </button>
              )}

              {onFindInApollo && (
                <button
                  type="button"
                  onClick={() => {
                    const firstCluster = (record.clusters || '').split(',')[0]?.split('(')[0]?.trim() || record.hubName;
                    onFindInApollo(firstCluster);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Find in Apollo</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
