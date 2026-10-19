import React, { useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { TieredLead } from '@/types/tierSegmentation';
import { TierScoreBadge } from './TierScoreBadge';

export interface TierScoreBreakdownModalProps {
  isOpen: boolean;
  lead: TieredLead | null;
  onClose: () => void;
}

export const TierScoreBreakdownModal: React.FC<TierScoreBreakdownModalProps> = ({
  isOpen,
  lead,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const bd = lead.score_breakdown || {
    frequency_score: 0,
    freight_control_score: 0,
    lane_score: 0,
    commodity_score: 0,
    mode_score: 0,
    volume_trend_score: 0,
    recency_score: 0,
    regulated_plant_bonus: 0,
    cluster_bonus: 0,
  };

  const getSalesActionText = () => {
    switch (lead.segment_status) {
      case 'Tier A':
        return 'Conduct immediate discovery verification call within 24 hours. If verified as Hot/Warm, prepare custom freight intelligence client report within 48 hours.';
      case 'Tier B':
        return 'Enroll prospect into automated 4-stage value email sequence. If prospect clicks or replies, immediately trigger Inside Sales phone outreach.';
      case 'Parked':
        return 'Account on hold. No active outreach bandwidth expended until market or commodity export season review.';
      case 'Excluded':
        return 'Strictly suppressed from cold outreach. Matched with active customer or competitor database; assigned to account management.';
      case 'Unscored':
      default:
        return 'Data remediation required. Assigned to research analyst for domain, lane, and HS code enrichment.';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-modal-title"
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-apollo/10 text-apollo flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="tier-modal-title" className="text-base font-semibold text-slate-900 line-clamp-1">
                {lead.company_name}
              </h3>
              <p className="text-xs text-slate-500">
                {lead.city || 'India'} · {lead.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status & Total Score Pill */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-medium text-slate-600">SOP Classification:</span>
              <TierScoreBadge status={lead.segment_status} score={lead.total_score} />
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Overall Score</div>
              <div className="text-xl font-bold font-mono text-apollo">
                {lead.total_score} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
            </div>
          </div>

          {/* Criteria Breakdown Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2.5">
              Criteria Evaluation Breakdown
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">1. Shipment Frequency (12 Months)</div>
                  <div className="text-[11px] text-slate-500">
                    {lead.total_shipments ? `${lead.total_shipments.toLocaleString()} shipments recorded` : '0 shipments'}
                  </div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.frequency_score} / 20 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">2. Freight Control & Incoterms</div>
                  <div className="text-[11px] text-slate-500">Exporter vs Buyer Freight Routing</div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.freight_control_score} / 15 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">3. Trade Lane Fit</div>
                  <div className="text-[11px] text-slate-500">{lead.trade_lanes || 'General Customs Routing'}</div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.lane_score} / 15 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">4. Commodity Fit & HS Codes</div>
                  <div className="text-[11px] text-slate-500">{lead.category} · {lead.subcategory}</div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.commodity_score} / 15 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">5. Transport Mode</div>
                  <div className="text-[11px] text-slate-500">{lead.transport_mode} Freight</div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.mode_score} / 15 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">6. Volume Trend</div>
                  <div className="text-[11px] text-slate-500">Trailing 6m vs Prior 6m Volume</div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.volume_trend_score} / 10 pts</span>
              </div>

              <div className="p-2.5 flex justify-between items-center hover:bg-slate-50/50">
                <div>
                  <div className="font-medium text-slate-800">7. Shipment Recency</div>
                  <div className="text-[11px] text-slate-500">
                    Latest Activity: {lead.latest_activity_date || 'Unknown'}
                  </div>
                </div>
                <span className="font-mono font-semibold text-slate-800">{bd.recency_score} / 10 pts</span>
              </div>

              {(bd.regulated_plant_bonus > 0 || bd.cluster_bonus > 0) && (
                <div className="p-2.5 flex justify-between items-center bg-emerald-50/40 text-emerald-800">
                  <div>
                    <div className="font-medium">Strategic Bonuses (Pharma / Cluster)</div>
                    <div className="text-[11px] text-emerald-600">Regulated Plant or Strategic Branch Match</div>
                  </div>
                  <span className="font-mono font-semibold">
                    +{bd.regulated_plant_bonus + bd.cluster_bonus} pts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Sales Action */}
          <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/80">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-1">
              <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
              <span>Recommended Sales Playbook:</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              {getSalesActionText()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 focus:outline-none transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
