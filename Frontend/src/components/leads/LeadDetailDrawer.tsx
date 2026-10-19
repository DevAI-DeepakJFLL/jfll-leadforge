import React, { useState, useEffect } from 'react';
import { Lead } from '@/types/lead';
import { CompanyAvatar } from './CompanyAvatar';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Layers,
  ExternalLink,
  Copy,
  Check,
  Bookmark,
  Sparkles,
  Send,
  ShieldCheck,
  Briefcase,
  Linkedin,
  Clock,
  ListPlus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface LeadDetailDrawerProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaveToggle?: (lead: Lead) => void;
  onCopy?: (text: string, type: 'email' | 'phone') => void;
  onAddToSequence?: (lead: Lead) => void;
  onAddToList?: (lead: Lead) => void;
  onComposeEmail?: (lead: Lead) => void;
}

import { useModalDismiss } from '@/hooks/useModalDismiss';
import { useClipboard } from '@/hooks/useClipboard';
import { formatDate } from '@/utils/formatters';

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onSaveToggle,
  onCopy,
  onAddToSequence,
  onAddToList,
  onComposeEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'activity'>('overview');

  useModalDismiss({ isOpen, onClose });

  const { copy: copyToClipboard, isCopied } = useClipboard({
    onSuccess: (text, field) => {
      onCopy?.(text, field?.includes('email') ? 'email' : 'phone');
    },
  });

  // Reset tab when lead changes
  useEffect(() => {
    if (lead) {
      setActiveTab('overview');
    }
  }, [lead?.id]);

  if (!isOpen || !lead) return null;

  const formattedDate = formatDate(lead.createdAt);

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-drawer-title"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 pointer-events-none">
        <div className="w-screen max-w-full sm:max-w-[480px] pointer-events-auto bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 shrink-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center space-x-3 min-w-0">
                <CompanyAvatar
                  company={lead.company}
                  logoBgColor={lead.logoBgColor}
                  logoTextColor={lead.logoTextColor}
                  logoInitials={lead.logoInitials}
                  companyLogo={lead.companyLogo}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      id="lead-drawer-title"
                      className="text-base font-bold text-slate-900 truncate leading-snug"
                    >
                      {lead.name}
                    </h2>
                  </div>
                  <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                    {lead.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                    <span className="font-semibold text-slate-700">{lead.company}</span>
                    <span>&bull;</span>
                    <span className="truncate">{lead.location}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (onComposeEmail) {
                    onComposeEmail(lead);
                  } else {
                    window.location.href = `mailto:${lead.email}`;
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 rounded-md shadow-2xs transition-colors"
                title="Send outreach email"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => onAddToSequence?.(lead)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition-colors"
                title="Enroll in sequence"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Sequence</span>
              </button>

              <button
                type="button"
                onClick={() => onAddToList?.(lead)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition-colors"
                title="Add to prospect list"
              >
                <ListPlus className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">List</span>
              </button>

              <button
                type="button"
                onClick={() => onSaveToggle?.(lead)}
                className={`p-1.5 rounded-md border text-xs transition-colors ${
                  lead.saved
                    ? 'bg-blue-50 border-blue-200 text-apollo hover:bg-blue-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title={lead.saved ? 'Saved in pipeline' : 'Save lead to pipeline'}
                aria-label={lead.saved ? 'Unsave lead' : 'Save lead'}
              >
                <Bookmark
                  className={`w-4 h-4 ${lead.saved ? 'fill-apollo text-apollo' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-200 px-5 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 text-xs font-semibold border-b-2 mr-5 transition-colors ${
                activeTab === 'overview'
                  ? 'border-apollo text-apollo'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Overview & Contact
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('company')}
              className={`py-2.5 text-xs font-semibold border-b-2 mr-5 transition-colors ${
                activeTab === 'company'
                  ? 'border-apollo text-apollo'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Company Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-apollo text-apollo'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Intelligence & Activity
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Job Change Notification Banner */}
            {lead.jobChange && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">Recent Job Change:</strong>
                  <p className="mt-0.5 text-amber-800">
                    {lead.name} started a new role at {lead.company} within the past 90 days. Ideal timing for outreach!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 1: OVERVIEW & CONTACT */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Contact Information Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Direct Contact Intelligence</span>
                  </h3>

                  {/* Work Email Card */}
                  <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Work Email</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified 100% Deliverable</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-2xs">
                      <span className="font-mono text-xs sm:text-sm font-semibold text-slate-900 select-all truncate">
                        {lead.email}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(lead.email, 'email')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors shrink-0 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                        title="Copy email"
                        aria-label="Copy email address"
                      >
                        {isCopied('email') ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Phone Numbers Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>Direct Dial</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-800 select-all truncate">
                          {lead.phone || 'Unavailable'}
                        </span>
                        {lead.phone && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(lead.phone, 'phone')}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo"
                            title="Copy phone"
                            aria-label="Copy direct phone number"
                          >
                            {isCopied('phone') ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>HQ Office Phone</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-semibold text-slate-800 select-all truncate">
                          {lead.workPhone || lead.phone || 'Unavailable'}
                        </span>
                        {(lead.workPhone || lead.phone) && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(lead.workPhone || lead.phone, 'workPhone')
                            }
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-apollo"
                            title="Copy HQ phone"
                            aria-label="Copy corporate HQ phone number"
                          >
                            {isCopied('workPhone') ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn & Web Presence */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                      <span className="text-xs font-medium text-slate-700">LinkedIn Profile</span>
                    </div>
                    {lead.linkedin ? (
                      <a
                        href={
                          /^https?:\/\//i.test(lead.linkedin)
                            ? lead.linkedin
                            : `https://${lead.linkedin}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-apollo hover:underline"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Not available</span>
                    )}
                  </div>
                </div>

                {/* Location Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location Details</span>
                  </h3>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-semibold text-slate-800">{lead.location}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">City / State:</span>
                      <span className="font-medium text-slate-800">
                        {lead.city || 'N/A'}, {lead.state || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Country:</span>
                      <span className="font-medium text-slate-800">{lead.country || 'United States'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPANY PROFILE */}
            {activeTab === 'company' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Company Firmographics</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>Industry</span>
                      </div>
                      <div className="font-semibold text-slate-900 truncate" title={lead.industry}>
                        {lead.industry}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Headcount</span>
                      </div>
                      <div className="font-semibold text-slate-900">{lead.employees} employees</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        <span>Annual Revenue</span>
                      </div>
                      <div className="font-semibold text-slate-900">{lead.revenue}</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span>Funding Stage</span>
                      </div>
                      <div className="font-semibold text-slate-900">{lead.funding}</div>
                    </div>
                  </div>
                </div>

                {/* Technologies Stack Tags */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Detected Technologies</span>
                  </h3>

                  {lead.technologies && lead.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      {lead.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                      No verified technologies detected yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: INTELLIGENCE & ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit & Discovery Timeline</span>
                  </h3>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="text-xs font-semibold text-slate-800">
                        Lead Profile Sourced & Verified
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formattedDate} &bull; Sourced via Apollo Search Engine
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="text-xs font-semibold text-slate-800">
                        Work Email Deliverability Validated
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        100% confidence &bull; SMTP mailbox ping response OK
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                      <div className="text-xs font-semibold text-slate-800">
                        Current Status: {lead.status}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {lead.saved ? 'Saved in personal pipeline' : 'Unsaved prospect'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Apollo Data Quality Guarantee</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Contact details are guaranteed accurate. Bounced emails trigger automatic credit refund in Apollo.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Persistent Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500">
              Lead ID: <code className="font-mono text-slate-700">{lead.id}</code>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md shadow-2xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailDrawer;
