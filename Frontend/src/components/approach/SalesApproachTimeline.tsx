import React, { useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import {
  APPROACH_STATUS_CHANGED_EVENT,
  fetchEntityApproachHistory,
} from '@/services/approachLogService';
import {
  EntityApproachHistory,
  SalesAction,
} from '@/types/approachLog';
import { SalesStatusBadge } from './SalesStatusBadge';

export interface SalesApproachTimelineProps {
  entityType: 'datamyne' | 'jfll_customer';
  entityId: string;
  companyName: string;
  onOpenLogModal: () => void;
  onOpenConvertModal?: () => void;
  showConvertButton?: boolean;
  className?: string;
}

function getActionIcon(action: SalesAction | string) {
  switch (action) {
    case 'Called customer':
      return <Phone className="w-3.5 h-3.5 text-blue-600" />;
    case 'Left voicemail':
      return <Mic className="w-3.5 h-3.5 text-amber-600" />;
    case 'Sent email':
      return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
    case 'Sent WhatsApp':
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
    case 'Sent report':
      return <FileText className="w-3.5 h-3.5 text-cyan-600" />;
    case 'Sent quote':
      return <DollarSign className="w-3.5 h-3.5 text-purple-600" />;
    case 'Held meeting':
      return <Users className="w-3.5 h-3.5 text-violet-600" />;
    case 'Follow-up scheduled':
      return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
    case 'Internal work (no customer contact)':
      return <Briefcase className="w-3.5 h-3.5 text-slate-600" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-slate-600" />;
  }
}

function formatTimelineDateTime(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: '' };
    const date = d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: isoString, time: '' };
  }
}

export const SalesApproachTimeline: React.FC<SalesApproachTimelineProps> = ({
  entityType,
  entityId,
  companyName,
  onOpenLogModal,
  onOpenConvertModal,
  showConvertButton = false,
  className = '',
}) => {
  const [history, setHistory] = useState<EntityApproachHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEntityApproachHistory(entityType, entityId);
      setHistory(data);
    } catch {
      // Fallback handled in service
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();

    const handleUpdate = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (
        customEvt.detail?.entityType === entityType &&
        customEvt.detail?.entityId === entityId
      ) {
        loadHistory();
      }
    };

    window.addEventListener(APPROACH_STATUS_CHANGED_EVENT, handleUpdate);
    return () => window.removeEventListener(APPROACH_STATUS_CHANGED_EVENT, handleUpdate);
  }, [entityType, entityId]);

  const currentStatus = history?.current_status || 'Not Contacted';
  const isConverted = history?.is_active_converted || currentStatus === 'Converted to Active';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Funnel Status:</span>
          <SalesStatusBadge status={currentStatus} />
        </div>

        <div className="flex items-center gap-2">
          {showConvertButton && !isConverted && onOpenConvertModal && (
            <button
              onClick={onOpenConvertModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-all cursor-pointer"
              title="Convert this customer to Active"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Convert to Active</span>
            </button>
          )}

          <button
            onClick={onOpenLogModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo/90 rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Log a sales call, email, or meeting"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Approach</span>
          </button>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500" title={`Outreach for ${companyName}`}>
            Activity Timeline ({history?.logs.length || 0})
          </h4>
          <button
            onClick={loadHistory}
            disabled={isLoading}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            title="Refresh timeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-slate-400 animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto" />
            <div className="h-16 bg-slate-100 rounded-xl w-full" />
          </div>
        ) : !history || history.logs.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No Outreach Logged Yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
              This lead starts at <strong>Not Contacted</strong>. Click below to record the first client outreach.
            </p>
            <button
              onClick={onOpenLogModal}
              className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-apollo bg-apollo/10 hover:bg-apollo/20 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Approach</span>
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {history.logs.map((log) => {
              const { date, time } = formatTimelineDateTime(log.created_at);
              const isConversion = log.status === 'Converted to Active';

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white shadow-2xs ${
                      isConversion
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-slate-300 text-slate-600 group-hover:border-apollo'
                    }`}
                  >
                    {isConversion ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      getActionIcon(log.action)
                    )}
                  </div>

                  {/* Card Content */}
                  <div
                    className={`p-3.5 rounded-xl border text-xs transition-shadow shadow-2xs ${
                      isConversion
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header: Action & Transition */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        {log.previous_status !== log.status && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            <span>{log.previous_status}</span>
                            <span>→</span>
                            <strong className="text-slate-800">{log.status}</strong>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono" title={log.created_at}>
                        {date} {time && `• ${time}`}
                      </span>
                    </div>

                    {/* Salesperson attribution */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>By <strong className="text-slate-700 font-medium">{log.salesperson_name}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400">{log.salesperson_email}</span>
                    </div>

                    {/* Note Content */}
                    {log.note && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                        "{log.note}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
