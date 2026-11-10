import React, { useEffect, useState } from 'react';
import {
  X,
  Building2,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  Save,
  Trash2,
  MessageSquare,
  DollarSign,
  Mic,
  Users,
  Activity,
} from 'lucide-react';
import {
  ALL_ROUTING_TYPES,
  ALL_TRACKER_STATUSES,
  ALL_TRANSPORT_MODES,
  LeadTrackerCreatePayload,
  LeadTrackerItem,
  LeadTrackerUpdatePayload,
  RoutingType,
  TrackerActivityCreatePayload,
  TrackerStatus,
  TransportMode,
} from '@/types/leadTracker';
import {
  logTrackerActivity,
  updateTrackedLead,
  createTrackedLead,
  deleteTrackedLead,
  getFollowupStatus,
  getRateValidityInfo,
} from '@/services/leadTrackerService';
import { getStatusStyle } from './LeadTrackerTable';

export interface LeadTrackerDrawerProps {
  isOpen: boolean;
  lead: LeadTrackerItem | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  onLeadUpdated?: (lead: LeadTrackerItem) => void;
  onLeadCreated?: (lead: LeadTrackerItem) => void;
  onLeadDeleted?: (id: string) => void;
  currentUser?: { name: string; email: string };
  className?: string;
}

export const STANDARD_SALES_REPS = [
  { name: 'Edward', branch: 'Mumbai', email: 'edward@jfll.com' },
  { name: 'Tasneem', branch: 'Mumbai', email: 'tasneem@jfll.com' },
  { name: 'Priyanka Sardesai', branch: 'Mumbai', email: 'priyanka.sardesai@jfll.com' },
  { name: 'Utkarsha', branch: 'Mumbai', email: 'utkarsha@jfll.com' },
  { name: 'Sanjay', branch: 'Mumbai', email: 'sanjay@jfll.com' },
  { name: 'Sidhart Ji', branch: 'Gujarat', email: 'sidhart@jfll.com' },
  { name: 'Jaya', branch: 'South India', email: 'jaya@jfll.com' },
];

export const STANDARD_BRANCHES = ['Mumbai', 'Gujarat', 'South India', 'Delhi', 'Other'];

export const QUICK_TOUCHPOINT_ACTIONS = [
  'Called customer',
  'Held meeting',
  'Sent quote',
  'Left voicemail',
  'Sent WhatsApp',
  'In-person visit',
  'Email follow-up',
  'Internal strategy discussion',
];

function getTimelineActionIcon(action: string) {
  switch (action) {
    case 'Called customer':
      return <Phone className="w-3.5 h-3.5 text-blue-600" />;
    case 'Held meeting':
      return <Users className="w-3.5 h-3.5 text-violet-600" />;
    case 'Sent quote':
      return <DollarSign className="w-3.5 h-3.5 text-purple-600" />;
    case 'Left voicemail':
      return <Mic className="w-3.5 h-3.5 text-amber-600" />;
    case 'Sent WhatsApp':
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />;
    case 'In-person visit':
      return <Building2 className="w-3.5 h-3.5 text-indigo-600" />;
    case 'Follow-up Scheduled':
      return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
    case 'Status Change':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    case 'Reassignment':
      return <User className="w-3.5 h-3.5 text-sky-600" />;
    default:
      return <Activity className="w-3.5 h-3.5 text-slate-500" />;
  }
}

function formatHistoryDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export const LeadTrackerDrawer: React.FC<LeadTrackerDrawerProps> = ({
  isOpen,
  lead,
  mode = 'edit',
  onClose,
  onLeadUpdated,
  onLeadCreated,
  onLeadDeleted,
  currentUser = { name: 'Tyra Theknath', email: 'tyra@jfll.com' },
  className = '',
}) => {
  // Form state
  const isEdit = mode === 'edit' && !!lead;
  const [companyName, setCompanyName] = useState(isEdit ? lead.company_name || '' : '');
  const [assignedTo, setAssignedTo] = useState(isEdit ? lead.assigned_to || 'Edward' : 'Edward');
  const [branch, setBranch] = useState(isEdit ? lead.branch || 'Mumbai' : 'Mumbai');
  const [status, setStatus] = useState<TrackerStatus>(isEdit ? lead.status || 'Assigned' : 'Assigned');
  const [transportMode, setTransportMode] = useState<TransportMode>(
    isEdit ? lead.transport_mode || 'Air Freight' : 'Air Freight'
  );
  const [routingType, setRoutingType] = useState<RoutingType>(
    isEdit ? lead.routing_type || 'Freehand' : 'Freehand'
  );
  const [contactPerson, setContactPerson] = useState(isEdit ? lead.contact_person || '' : '');
  const [contactPhone, setContactPhone] = useState(isEdit ? lead.contact_phone || '' : '');
  const [contactEmail, setContactEmail] = useState(isEdit ? lead.contact_email || '' : '');
  const [quoteDate, setQuoteDate] = useState(isEdit ? lead.quote_date || '' : '');
  const [rateValidityDate, setRateValidityDate] = useState(isEdit ? lead.rate_validity_date || '' : '');
  const [targetShipmentDate, setTargetShipmentDate] = useState(
    isEdit ? lead.target_shipment_date || '' : ''
  );
  const [nextFollowupDate, setNextFollowupDate] = useState(isEdit ? lead.next_followup_date || '' : '');
  const [nextAction, setNextAction] = useState(isEdit ? lead.next_action || '' : '');
  const [feedbackNotes, setFeedbackNotes] = useState(isEdit ? lead.feedback_notes || '' : '');

  // Quick touchpoint logger state
  const [touchAction, setTouchAction] = useState('Called customer');
  const [touchNotes, setTouchNotes] = useState('');
  const [touchNewStatus, setTouchNewStatus] = useState<TrackerStatus | ''>('');
  const [touchNextDate, setTouchNextDate] = useState('');
  const [isLoggingTouchpoint, setIsLoggingTouchpoint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'touchpoints' | 'details'>(mode === 'create' ? 'details' : 'touchpoints');

  // Sync state when lead or mode changes
  useEffect(() => {
    setActiveTab(mode === 'create' ? 'details' : 'touchpoints');
    if (lead && mode === 'edit') {
      setCompanyName(lead.company_name || '');
      setAssignedTo(lead.assigned_to || 'Edward');
      setBranch(lead.branch || 'Mumbai');
      setStatus(lead.status || 'Assigned');
      setTransportMode(lead.transport_mode || 'Air Freight');
      setRoutingType(lead.routing_type || 'Freehand');
      setContactPerson(lead.contact_person || '');
      setContactPhone(lead.contact_phone || '');
      setContactEmail(lead.contact_email || '');
      setQuoteDate(lead.quote_date || '');
      setRateValidityDate(lead.rate_validity_date || '');
      setTargetShipmentDate(lead.target_shipment_date || '');
      setNextFollowupDate(lead.next_followup_date || '');
      setNextAction(lead.next_action || '');
      setFeedbackNotes(lead.feedback_notes || '');
    } else if (mode === 'create') {
      setCompanyName('');
      setAssignedTo('Edward');
      setBranch('Mumbai');
      setStatus('Assigned');
      setTransportMode('Air Freight');
      setRoutingType('Freehand');
      setContactPerson('');
      setContactPhone('');
      setContactEmail('');
      setQuoteDate('');
      setRateValidityDate('');
      setTargetShipmentDate('');
      setNextFollowupDate('');
      setNextAction('');
      setFeedbackNotes('');
    }
    setTouchNotes('');
    setTouchNewStatus('');
    setTouchNextDate('');
    setShowDeleteConfirm(false);
    setBannerMessage(null);
  }, [lead, mode, isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRepChange = (newRep: string) => {
    setAssignedTo(newRep);
    const repMatch = STANDARD_SALES_REPS.find((r) => r.name.toLowerCase() === newRep.toLowerCase());
    if (repMatch) {
      setBranch(repMatch.branch);
    }
  };

  const handleQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const dateStr = d.toISOString().slice(0, 10);
    setNextFollowupDate(dateStr);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setBannerMessage('Company name is required');
      return;
    }

    setIsSaving(true);
    setBannerMessage(null);

    try {
      if (mode === 'create') {
        const payload: LeadTrackerCreatePayload = {
          company_name: companyName.trim(),
          assigned_to: assignedTo,
          branch,
          status,
          transport_mode: transportMode,
          routing_type: routingType,
          contact_person: contactPerson.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          quote_date: quoteDate || null,
          rate_validity_date: rateValidityDate || null,
          target_shipment_date: targetShipmentDate || null,
          next_followup_date: nextFollowupDate || null,
          next_action: nextAction.trim() || null,
          feedback_notes: feedbackNotes.trim() || null,
          assigned_by: currentUser.name,
        };
        const created = await createTrackedLead(payload);
        if (onLeadCreated) onLeadCreated(created);
        onClose();
      } else if (lead) {
        const updates: LeadTrackerUpdatePayload = {
          company_name: companyName.trim(),
          assigned_to: assignedTo,
          branch,
          status,
          transport_mode: transportMode,
          routing_type: routingType,
          contact_person: contactPerson.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
          quote_date: quoteDate || null,
          rate_validity_date: rateValidityDate || null,
          target_shipment_date: targetShipmentDate || null,
          next_followup_date: nextFollowupDate || null,
          next_action: nextAction.trim() || null,
          feedback_notes: feedbackNotes.trim() || null,
          assigned_by: currentUser.name,
        };
        const updated = await updateTrackedLead(lead.id, updates);
        if (onLeadUpdated) onLeadUpdated(updated);
        setBannerMessage('Lead updated successfully');
        setTimeout(() => setBannerMessage(null), 3000);
      }
    } catch (err) {
      setBannerMessage(`Error: ${String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogTouchpoint = async () => {
    if (!lead || !touchNotes.trim()) {
      setBannerMessage('Please enter interaction notes before logging');
      return;
    }

    setIsLoggingTouchpoint(true);
    setBannerMessage(null);

    try {
      const payload: TrackerActivityCreatePayload = {
        action: touchAction,
        notes: touchNotes.trim(),
        author_name: currentUser.name,
        author_email: currentUser.email,
        status: touchNewStatus ? touchNewStatus : null,
        next_followup_date: touchNextDate ? touchNextDate : undefined,
      };

      const updated = await logTrackerActivity(lead.id, payload);
      if (touchNewStatus) setStatus(touchNewStatus);
      if (touchNextDate) setNextFollowupDate(touchNextDate);
      setTouchNotes('');
      setTouchNewStatus('');
      setTouchNextDate('');
      if (onLeadUpdated) onLeadUpdated(updated);
      setBannerMessage('Touchpoint activity logged to history');
      setTimeout(() => setBannerMessage(null), 3000);
    } catch (err) {
      setBannerMessage(`Failed to log activity: ${String(err)}`);
    } finally {
      setIsLoggingTouchpoint(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      await deleteTrackedLead(lead.id);
      if (onLeadDeleted) onLeadDeleted(lead.id);
      onClose();
    } catch (err) {
      setBannerMessage(`Delete failed: ${String(err)}`);
      setIsDeleting(false);
    }
  };

  const historyEntries = lead?.history ? [...lead.history].reverse() : [];
  const statusConfig = getStatusStyle(status);
  const followupUrgency = getFollowupStatus(nextFollowupDate, status);
  const rateValidityInfo = rateValidityDate ? getRateValidityInfo({ rate_validity_date: rateValidityDate }) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracker-drawer-title"
      className={`fixed inset-0 z-50 overflow-hidden ${className}`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="tracker-drawer-title" className="text-base font-bold text-slate-900 leading-tight">
                    {mode === 'create' ? 'Add New Tracked Lead' : lead?.company_name || 'Lead Details'}
                  </h2>
                  {mode === 'edit' && lead && (
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${statusConfig.badge}`}>
                      {status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                  <span>{mode === 'create' ? 'Assign to Freight Sales Coordinator' : `ID: ${lead?.id}`}</span>
                  {mode === 'edit' && lead?.linked_entity_type && (
                    <span className="font-medium text-slate-600">{`· Source: ${lead.linked_entity_type}`}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation in Edit Mode */}
          {mode === 'edit' && lead && (
            <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center shrink-0">
              <div
                role="tablist"
                aria-label="Lead Drawer Tabs"
                className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium w-full sm:w-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'touchpoints'}
                  onClick={() => setActiveTab('touchpoints')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold ${
                    activeTab === 'touchpoints'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Touchpoints &amp; History</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      activeTab === 'touchpoints' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {historyEntries.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold ${
                    activeTab === 'details'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Lead Details &amp; Commercials</span>
                </button>
              </div>
            </div>
          )}

          {/* Banner alert if message exists */}
          {bannerMessage && (
            <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 text-xs font-medium text-blue-800 flex items-center justify-between">
              <span>{bannerMessage}</span>
              <button
                type="button"
                onClick={() => setBannerMessage(null)}
                className="text-blue-500 hover:text-blue-700 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1 (Details Panel): Lead Details, Commercials, Rate Horizon */}
            <div className={activeTab === 'details' || mode === 'create' ? 'space-y-5' : 'hidden'}>
              <form onSubmit={handleSaveLead} id="lead-tracker-form" className="space-y-5">
                {/* Company Name */}
                <div>
                  <label htmlFor="drawer-company-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="drawer-company-name"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Chemical & Pharmaceuticals Ltd"
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-colors"
                  />
                </div>

                {/* Rep & Branch Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="drawer-assigned-rep" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Sales Rep
                    </label>
                    <select
                      id="drawer-assigned-rep"
                      value={assignedTo}
                      onChange={(e) => handleRepChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                    >
                      {STANDARD_SALES_REPS.map((rep) => (
                        <option key={rep.name} value={rep.name}>
                          {`${rep.name} (${rep.branch})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="drawer-branch" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Branch Office
                    </label>
                    <select
                      id="drawer-branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                    >
                      {STANDARD_BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stage & Transport Mode Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="drawer-stage" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      id="drawer-stage"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as TrackerStatus)}
                      className={`w-full text-xs px-3 py-2 border rounded-md font-medium outline-hidden ${statusConfig.badge}`}
                    >
                      {ALL_TRACKER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="drawer-mode" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Transport Mode
                    </label>
                    <select
                      id="drawer-mode"
                      value={transportMode}
                      onChange={(e) => setTransportMode(e.target.value as TransportMode)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                    >
                      {ALL_TRANSPORT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Routing Control: Freehand vs Nominated */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Routing Control (Shipper Direct vs Buyer Nominated)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {ALL_ROUTING_TYPES.map((rt) => {
                      const active = routingType === rt;
                      return (
                        <button
                          key={rt}
                          type="button"
                          onClick={() => setRoutingType(rt)}
                          className={`text-xs py-1.5 px-3 rounded-md font-medium border text-center transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {rt}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {routingType === 'Freehand' && '• Freehand: Shipper controls freight selection in India. Pitch directly.'}
                    {routingType === 'Nominated' && '• Nominated: Overseas consignee dictates forwarder. Need overseas agency coordination.'}
                    {routingType === 'Not Specified' && '• Not Specified: Determine during initial discovery call.'}
                  </p>
                </div>

                {/* Rate & Quotation Horizon Panel */}
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                      Rate &amp; Quotation Horizon
                    </span>
                    {rateValidityInfo && rateValidityInfo.status !== 'none' && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${rateValidityInfo.badgeClass}`}>
                        {rateValidityInfo.label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="drawer-quote-date" className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Quote Date
                      </label>
                      <input
                        id="drawer-quote-date"
                        type="date"
                        value={quoteDate}
                        onChange={(e) => setQuoteDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="drawer-rate-validity" className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Rate Validity Expiry
                      </label>
                      <input
                        id="drawer-rate-validity"
                        type="date"
                        value={rateValidityDate}
                        onChange={(e) => setRateValidityDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="drawer-target-shipment" className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Target Shipment Date
                      </label>
                      <input
                        id="drawer-target-shipment"
                        type="date"
                        value={targetShipmentDate}
                        onChange={(e) => setTargetShipmentDate(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information (Name, Phone, Email) */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    Primary Logistics Contact
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="drawer-contact-person" className="block text-[11px] text-slate-500 mb-0.5">Contact Name</label>
                      <input
                        id="drawer-contact-person"
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="e.g. Sunil Patil"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="drawer-contact-phone" className="block text-[11px] text-slate-500 mb-0.5">Phone / Mobile</label>
                      <input
                        id="drawer-contact-phone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98200..."
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>

                    <div>
                      <label htmlFor="drawer-contact-email" className="block text-[11px] text-slate-500 mb-0.5">Email</label>
                      <input
                        id="drawer-contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="logistics@company.com"
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Follow-up Date & Next Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="drawer-followup-date" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Next Follow-up Date
                      </label>
                      {followupUrgency === 'overdue' && (
                        <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <input
                      id="drawer-followup-date"
                      type="date"
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:border-blue-500 outline-hidden"
                    />
                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickDate(1)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(3)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        +3 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDate(7)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                      >
                        +1 Week
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="drawer-next-action" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Next Action / Target
                    </label>
                    <input
                      id="drawer-next-action"
                      type="text"
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                      placeholder="e.g. Schedule meeting with pricing person"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 outline-hidden"
                    />
                  </div>
                </div>

                {/* Feedback Notes */}
                <div>
                  <label htmlFor="drawer-feedback-notes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Operational Feedback &amp; Commercial Notes
                  </label>
                  <textarea
                    id="drawer-feedback-notes"
                    rows={3}
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="Record carrier rate competitiveness, credit terms, special packaging / temperature control, or shipment volume..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 outline-hidden"
                  />
                </div>

                {/* Save Button for Form */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : mode === 'create' ? 'Create Tracked Lead' : 'Save Details'}</span>
                  </button>

                  {mode === 'edit' && lead && (
                    <div>
                      {!showDeleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="text-xs text-rose-600 hover:text-rose-800 p-1 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Lead</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-rose-700 font-medium">Are you sure?</span>
                          <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] rounded font-semibold cursor-pointer"
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* TAB 2 (Touchpoints Panel): Quick Touchpoint Logger & Interaction History */}
            <div className={activeTab === 'touchpoints' && mode === 'edit' ? 'space-y-6' : 'hidden'}>
              {mode === 'edit' && lead && (
                <>
                  {/* Lead Cadence Summary Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {lead.assigned_to.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">
                          {lead.assigned_to} <span className="text-slate-400 font-normal">({lead.branch})</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lead.next_action || 'No pending action'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Next Cadence
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">
                        {lead.next_followup_date || 'None scheduled'}
                      </div>
                    </div>
                  </div>

                  {/* Quick Touchpoint Logger */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      Quick Touchpoint Logger
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="touchpoint-action-select" className="block text-[11px] text-slate-600 mb-0.5">Interaction Type</label>
                          <select
                            id="touchpoint-action-select"
                            value={touchAction}
                            onChange={(e) => setTouchAction(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                          >
                            {QUICK_TOUCHPOINT_ACTIONS.map((act) => (
                              <option key={act} value={act}>
                                {act}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="touchpoint-status-update" className="block text-[11px] text-slate-600 mb-0.5">Update Stage (Optional)</label>
                          <select
                            id="touchpoint-status-update"
                            value={touchNewStatus}
                            onChange={(e) => setTouchNewStatus(e.target.value as TrackerStatus | '')}
                            className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                          >
                            <option value="">Keep current ({lead.status})</option>
                            {ALL_TRACKER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="touchpoint-notes-input" className="block text-[11px] text-slate-600 mb-0.5">
                          Touchpoint Note <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          id="touchpoint-notes-input"
                          rows={2}
                          value={touchNotes}
                          onChange={(e) => setTouchNotes(e.target.value)}
                          placeholder="e.g. Spoke to logistics head; requested rate quote for 25 containers sea freight to Rotterdam..."
                          className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded focus:border-blue-500 outline-hidden"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label htmlFor="touchpoint-reschedule-date" className="text-[11px] text-slate-600">Reschedule follow-up:</label>
                          <input
                            id="touchpoint-reschedule-date"
                            type="date"
                            value={touchNextDate}
                            onChange={(e) => setTouchNextDate(e.target.value)}
                            className="text-xs px-2 py-1 bg-white border border-slate-300 rounded outline-hidden"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleLogTouchpoint}
                          disabled={isLoggingTouchpoint || !touchNotes.trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>{isLoggingTouchpoint ? 'Logging...' : 'Log Touchpoint'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chronological History Timeline */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-500" />
                        Touchpoint &amp; Interaction History
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        {`${historyEntries.length} ${historyEntries.length === 1 ? 'event' : 'events'}`}
                      </span>
                    </div>

                    {historyEntries.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        No history logged yet. Use the logger above to record touchpoints.
                      </p>
                    ) : (
                      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {historyEntries.map((entry) => (
                          <div key={entry.id} className="relative group">
                            {/* Dot / Icon */}
                            <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                              {getTimelineActionIcon(entry.action)}
                            </div>

                            {/* Card */}
                            <div className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded border border-slate-200/80 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800">
                                  {entry.action}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formatHistoryDateTime(entry.timestamp)}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-500 mt-0.5">
                                By <span className="font-medium text-slate-700">{entry.author_name}</span>
                              </div>

                              {entry.notes && (
                                <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap leading-relaxed">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
