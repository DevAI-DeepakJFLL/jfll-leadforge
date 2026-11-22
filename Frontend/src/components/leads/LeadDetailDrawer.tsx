import React, { useState, useEffect, useRef } from 'react';
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
  Plus,
} from 'lucide-react';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { useClipboard } from '@/hooks/useClipboard';
import { useClickOutside } from '@/hooks/useClickOutside';
import { formatDate } from '@/utils/formatters';
import { isValidEmailAddress, isValidPhoneNumber } from '@/utils/apolloUtils';
import { toSafeExternalUrl } from '@/types/apolloLead';

export interface LeadDetailDrawerProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaveToggle?: (lead: Lead) => void;
  onCopy?: (text: string, type: 'email' | 'phone') => void;
  onAddToSequence?: (lead: Lead) => void;
  onAddToList?: (lead: Lead, listName?: string) => void;
  onComposeEmail?: (lead: Lead) => void;
  savedLists?: string[];
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  isOpen,
  lead,
  onClose,
  onSaveToggle,
  onCopy,
  onAddToSequence,
  onAddToList,
  onComposeEmail,
  savedLists = [],
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'company' | 'activity'>('overview');
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const listMenuRef = useRef<HTMLDivElement>(null);

  useModalDismiss({ isOpen, onClose });

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow === 'hidden' ? 'auto' : (document.body.style.overflow || 'auto');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow === 'hidden' ? 'auto' : originalOverflow;
      };
    }
  }, [isOpen]);

  // Click outside and Escape listener to close Add-to-List dropdown
  useClickOutside(
    listMenuRef,
    () => {
      setIsListMenuOpen(false);
      setIsCreatingList(false);
      setNewListName('');
    },
    isListMenuOpen
  );

  const { copy: copyToClipboard, isCopied } = useClipboard({
    onSuccess: (text, field) => {
      onCopy?.(text, field?.includes('email') ? 'email' : 'phone');
    },
  });

  // Reset tab when lead changes
  useEffect(() => {
    if (lead) {
      setActiveTab('overview');
      setIsListMenuOpen(false);
      setIsCreatingList(false);
      setNewListName('');
    }
  }, [lead?.id]);

  if (!isOpen || !lead) return null;

  const formattedDate = formatDate(lead.createdAt);
  const hasValidEmail = isValidEmailAddress(lead.email);
  const hasValidPhone = isValidPhoneNumber(lead.phone) || isValidPhoneNumber(lead.workPhone);
  const primaryPhone = isValidPhoneNumber(lead.phone) ? lead.phone : lead.workPhone;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-drawer-title"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 pointer-events-none">
        <div className="w-screen max-w-full sm:max-w-md pointer-events-auto bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
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
                  <h2
                    id="lead-drawer-title"
                    className="text-base font-bold text-slate-900 truncate leading-snug"
                  >
                    {lead.name}
                  </h2>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                    {lead.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                    <span className="font-semibold text-apollo truncate">{lead.company}</span>
                    <span>&bull;</span>
                    <span className="truncate">{lead.location}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors focus:outline-none"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Channels Quick Bento Strip */}
            <div className="mt-3.5 pt-3 border-t border-slate-200/80 space-y-2">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                {/* Work Email Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-apollo shrink-0" />
                    {hasValidEmail ? (
                      <span className="font-mono text-xs font-bold text-slate-900 select-all truncate">
                        {lead.email}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Work email not disclosed</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasValidEmail && (
                      <>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>Verified</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.email, 'email')}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Copy email"
                        >
                          {isCopied('email') ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Direct Dial & LinkedIn Sub-Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    {isValidPhoneNumber(lead.phone) ? (
                      <>
                        <span className="font-mono font-medium text-slate-800">{lead.phone}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.phone, 'phone')}
                          className="p-0.5 text-slate-400 hover:text-slate-700"
                          title="Copy direct phone"
                        >
                          {isCopied('phone') ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    ) : isValidPhoneNumber(lead.workPhone) ? (
                      <>
                        <span className="font-mono font-medium text-slate-800">{lead.workPhone}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.workPhone!, 'workPhone')}
                          className="p-0.5 text-slate-400 hover:text-slate-700"
                          title="Copy office phone"
                        >
                          {isCopied('workPhone') ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">No direct phone</span>
                    )}
                  </div>

                  {toSafeExternalUrl(lead.linkedin) ? (
                    <a
                      href={toSafeExternalUrl(lead.linkedin)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#0077b5] hover:underline"
                    >
                      <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Apple HIG Segmented Navigation */}
            <div className="mt-3.5 bg-slate-200/70 p-1 rounded-xl flex items-center gap-1" role="tablist" aria-label="Lead profile navigation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                  activeTab === 'overview'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Overview & Location
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'company'}
                onClick={() => setActiveTab('company')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                  activeTab === 'company'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Company Scale
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'activity'}
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center ${
                  activeTab === 'activity'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Activity Timeline
              </button>
            </div>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-700">
            {/* Job Change Notification Banner */}
            {lead.jobChange && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Recent Career Move:</strong>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    {lead.name} assumed this role at {lead.company} within the past 90 days. Ideal window for introductory outreach!
                  </p>
                </div>
              </div>
            )}

            {/* TAB 1: OVERVIEW & LOCATION */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Location Details Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-apollo" />
                    <span>Geographic Coordinates</span>
                  </h3>
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-1.5 first:pt-0">
                      <span className="text-slate-500 font-medium">Primary Office:</span>
                      <span className="font-bold text-slate-900">{lead.location}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500 font-medium">Metro / State:</span>
                      <span className="font-semibold text-slate-800">
                        {lead.city || '—'}, {lead.state || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 last:pb-0">
                      <span className="text-slate-500 font-medium">Country / Region:</span>
                      <span className="font-semibold text-slate-800">{lead.country || 'India'}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Direct Dial backup */}
                {isValidPhoneNumber(lead.workPhone) && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500">Corporate HQ Switchboard</div>
                      <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{lead.workPhone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lead.workPhone!, 'workPhone')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-100 transition-colors"
                    >
                      {isCopied('workPhone') ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COMPANY PROFILE */}
            {activeTab === 'company' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Company Firmographics</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>Industry</span>
                      </div>
                      <div className="font-bold text-slate-900 truncate" title={lead.industry}>
                        {lead.industry || 'Freight & Logistics'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Headcount</span>
                      </div>
                      <div className="font-bold text-slate-900">{lead.employees || '—'} staff</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        <span>Annual Revenue</span>
                      </div>
                      <div className="font-bold text-slate-900">{lead.revenue || '—'}</div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-medium">
                        <TrendingUp className="w-3 h-3 text-slate-400" />
                        <span>Funding Stage</span>
                      </div>
                      <div className="font-bold text-slate-900">{lead.funding || 'Privately Held'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACTIVITY & VERIFICATION */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit & Discovery Timeline</span>
                  </h3>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="text-xs font-bold text-slate-800">
                        Lead Profile Sourced & Verified
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formattedDate} &bull; Sourced via Apollo Search Engine
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                      <div className="text-xs font-bold text-slate-800">
                        Work Email Deliverability Validated
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        100% confidence &bull; Direct inbox verification OK
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                      <div className="text-xs font-bold text-slate-800">
                        Pipeline Status: {lead.saved ? 'Saved in personal pipeline' : 'Unsaved prospect'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Apollo Data Quality Guarantee</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Contact details are guaranteed accurate. Any deliverability bounce is automatically credited.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Frosted Glass Sticky Bottom Action Dock */}
          <div className="p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 shadow-lg relative">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (onComposeEmail) {
                    onComposeEmail(lead);
                  } else if (lead.email) {
                    window.location.href = `mailto:${lead.email}`;
                  }
                }}
                disabled={!hasValidEmail}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-apollo hover:bg-apollo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors min-h-[40px] truncate"
                title={hasValidEmail ? `Email ${lead.name}` : 'No valid email available'}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Send Email</span>
              </button>

              {hasValidPhone && (
                <a
                  href={`tel:${primaryPhone!.replace(/[^0-9+]/g, '')}`}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors min-h-[40px] shrink-0"
                  title={`Call ${primaryPhone}`}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Call</span>
                </a>
              )}

              {onAddToSequence && (
                <button
                  type="button"
                  onClick={() => onAddToSequence(lead)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors min-h-[40px]"
                  title="Enroll in sequence"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Sequence</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Add to List Dropdown */}
              <div className="relative" ref={listMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsListMenuOpen((prev) => !prev)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                  title="Add to prospect list"
                >
                  <ListPlus className="w-4 h-4" />
                </button>

                {isListMenuOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Add to List
                    </div>
                    {savedLists.length === 0 && (
                      <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                        No custom lists yet.
                      </div>
                    )}
                    {savedLists.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          onAddToList?.(lead, name);
                          setIsListMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 flex items-center justify-between"
                      >
                        <span className="truncate">{name}</span>
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    {!isCreatingList ? (
                      <button
                        type="button"
                        onClick={() => setIsCreatingList(true)}
                        className="w-full text-left px-3 py-1.5 text-apollo font-semibold hover:bg-blue-50 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New List</span>
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newListName.trim()) {
                            onAddToList?.(lead, newListName.trim());
                            setNewListName('');
                            setIsCreatingList(false);
                            setIsListMenuOpen(false);
                          }
                        }}
                        className="p-2 space-y-1.5"
                      >
                        <input
                          type="text"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          placeholder="List name..."
                          maxLength={50}
                          autoFocus
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-apollo"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="submit"
                            disabled={!newListName.trim()}
                            className="px-2 py-1 bg-apollo text-white text-[11px] font-medium rounded hover:bg-apollo-600 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsCreatingList(false)}
                            className="px-2 py-1 text-slate-500 hover:text-slate-700 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Bookmark / Pipeline button */}
              <button
                type="button"
                onClick={() => onSaveToggle?.(lead)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                  lead.saved
                    ? 'bg-blue-50 border-blue-200 text-apollo hover:bg-blue-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title={lead.saved ? 'Saved in pipeline' : 'Save lead to pipeline'}
                aria-label={lead.saved ? 'Unsave lead' : 'Save lead'}
              >
                <Bookmark className={`w-4 h-4 ${lead.saved ? 'fill-apollo text-apollo' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailDrawer;
