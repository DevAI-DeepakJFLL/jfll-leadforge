import React, { useState } from 'react';
import {
  Shield,
  X,
  Users,
  Inbox,
  History,
  Search,
  UserPlus,
  Check,
  Ban,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Mail,
  User,
  Briefcase,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  AccessRequest,
  FunctionalRole,
} from '@/types/admin';
import {
  fetchAdminStats,
  fetchAccessRequests,
  fetchAllowlist,
  approveAccessRequest,
  rejectAccessRequest,
  addAllowlistEntry,
  revokeAllowlistEntry,
} from '@/services/adminService';
import { useToast } from '@/components/ui';

export interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

const AVAILABLE_ROLES: FunctionalRole[] = [
  'Commercial',
  'Operations',
  'Tech Lead',
  'Leadership',
  'Admin',
  'Sales Representative',
];

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = '',
}) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'requests' | 'allowlist' | 'history'>('requests');
  const [allowlistFilter, setAllowlistFilter] = useState<'active' | 'revoked' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Approve dialog state
  const [approvingReq, setApprovingReq] = useState<AccessRequest | null>(null);
  const [selectedRole, setSelectedRole] = useState<FunctionalRole>('Commercial');
  const [approvalNotes, setApprovalNotes] = useState('');

  // Reject dialog state
  const [rejectingReq, setRejectingReq] = useState<AccessRequest | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Add personnel modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<FunctionalRole>('Commercial');
  const [addError, setAddError] = useState('');

  // Queries
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    enabled: isOpen,
    refetchInterval: 15000,
  });

  const { data: requests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => fetchAccessRequests('all'),
    enabled: isOpen,
  });

  const { data: allowlist = [], isLoading: isLoadingAllowlist } = useQuery({
    queryKey: ['admin-allowlist'],
    queryFn: () => fetchAllowlist('all'),
    enabled: isOpen,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, role, notes }: { id: string; role: FunctionalRole; notes: string }) =>
      approveAccessRequest(id, { role, notes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-allowlist'] });
      showToast?.(data.message);
      setApprovingReq(null);
      setApprovalNotes('');
    },
    onError: (err: Error) => {
      showToast?.(err.message || 'Approval failed', 'error');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      rejectAccessRequest(id, { notes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      showToast?.(data.message);
      setRejectingReq(null);
      setRejectionNotes('');
    },
    onError: (err: Error) => {
      showToast?.(err.message || 'Rejection failed', 'error');
    },
  });

  const addAllowlistMutation = useMutation({
    mutationFn: (payload: { email: string; name: string; role: FunctionalRole }) =>
      addAllowlistEntry(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-allowlist'] });
      showToast?.(data.message);
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setAddError('');
    },
    onError: (err: Error) => {
      setAddError(err.message || 'Failed to add personnel');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (email: string) => revokeAllowlistEntry(email),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-allowlist'] });
      showToast?.(data.message);
    },
    onError: (err: Error) => {
      showToast?.(err.message || 'Revocation failed', 'error');
    },
  });

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const historyRequests = requests.filter((r) => r.status !== 'pending');

  const filteredAllowlist = allowlist.filter((entry) => {
    if (allowlistFilter !== 'all' && entry.status !== allowlistFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.email.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.role.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Leadership':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Tech Lead':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Admin':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Operations':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-portal-title"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-150 text-slate-800"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B132B] via-[#0E1A3D] to-[#14234F] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-apollo-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="admin-portal-title" className="text-base sm:text-lg font-bold tracking-tight">
                  Root Administration Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  {stats?.active_allowlist_count ? `${stats.active_allowlist_count} Personnel Allowed` : 'Access Master'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Manage employee email allowlist and review self-service access requests.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Admin Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 pt-3 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'requests'}
              onClick={() => setActiveTab('requests')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'border-apollo text-apollo font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Pending Requests</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'allowlist'}
              onClick={() => setActiveTab('allowlist')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'allowlist'
                  ? 'border-apollo text-apollo font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Active Allowlist</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                {allowlist.filter((a) => a.status === 'active').length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'border-apollo text-apollo font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit History</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                {historyRequests.length}
              </span>
            </button>
          </div>

          {activeTab === 'allowlist' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mb-2 py-1.5 px-3 bg-apollo hover:bg-apollo-600 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Personnel</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[300px] bg-slate-50/50">
          {/* TAB 1: PENDING REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {isLoadingRequests ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-apollo" />
                  <span className="text-xs">Loading access requests...</span>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">All Caught Up!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    There are no pending application access requests awaiting review.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{req.name || req.email}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{req.email}</span>
                      </div>
                      <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-600 block text-[10px] uppercase tracking-wider mb-0.5">
                          Reason / Justification:
                        </span>
                        {req.reason}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Requested on {new Date(req.requested_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        onClick={() => {
                          setApprovingReq(req);
                          setSelectedRole('Commercial');
                        }}
                        className="flex-1 sm:flex-none py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                      <button
                        onClick={() => setRejectingReq(req)}
                        className="flex-1 sm:flex-none py-2 px-3 bg-white hover:bg-red-50 text-red-700 border border-red-200 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE ALLOWLIST */}
          {activeTab === 'allowlist' && (
            <div className="space-y-3">
              {/* Search Bar & Status Segmented Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search allowlist by name, email, or role..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-apollo focus:ring-2 focus:ring-apollo/10"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setAllowlistFilter('active')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      allowlistFilter === 'active'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active ({allowlist.filter((a) => a.status === 'active').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowlistFilter('revoked')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      allowlistFilter === 'revoked'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Revoked ({allowlist.filter((a) => a.status === 'revoked').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowlistFilter('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      allowlistFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({allowlist.length})
                  </button>
                </div>
              </div>

              {isLoadingAllowlist ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-apollo" />
                  <span className="text-xs">Loading allowlist directory...</span>
                </div>
              ) : filteredAllowlist.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6 text-slate-500 text-xs">
                  {allowlistFilter === 'revoked'
                    ? 'No revoked employees found.'
                    : 'No matching employees found on the allowlist.'}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                          <th className="py-2.5 px-3">Personnel</th>
                          <th className="py-2.5 px-3">Functional Role</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Authorized On</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAllowlist.map((entry) => {
                          const isRoot =
                            entry.email.toLowerCase() === 'deepak@jfll.com' ||
                            entry.email.toLowerCase() === 'tyra.theknath@jfll.com';
                          const isSelf = entry.email.toLowerCase() === currentUserEmail.toLowerCase();

                          return (
                            <tr key={entry.email} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{entry.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{entry.email}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getRoleBadgeColor(
                                    entry.role
                                  )}`}
                                >
                                  {entry.role}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    entry.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {entry.status === 'active' ? 'Active' : 'Revoked'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                {new Date(entry.added_at).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isRoot ? (
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                    Root Admin
                                  </span>
                                ) : isSelf ? (
                                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                    Current Session
                                  </span>
                                ) : entry.status === 'active' ? (
                                  <button
                                    onClick={() => revokeMutation.mutate(entry.email)}
                                    disabled={revokeMutation.isPending}
                                    className="py-1 px-2.5 text-red-600 hover:bg-red-50 rounded-md font-semibold text-[11px] border border-red-200 transition-colors cursor-pointer"
                                  >
                                    Revoke Access
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      addAllowlistMutation.mutate({
                                        email: entry.email,
                                        name: entry.name,
                                        role: entry.role as FunctionalRole,
                                      })
                                    }
                                    className="py-1 px-2.5 text-emerald-700 hover:bg-emerald-50 rounded-md font-semibold text-[11px] border border-emerald-200 transition-colors cursor-pointer"
                                  >
                                    Restore Access
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {historyRequests.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6 text-slate-500 text-xs">
                  No historical access decisions logged yet.
                </div>
              ) : (
                historyRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{req.name || req.email}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {req.status === 'approved' ? 'Approved' : 'Declined'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{req.email}</div>
                      {req.review_notes && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                          <span className="font-semibold text-slate-500">Review Notes:</span> {req.review_notes}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 text-left sm:text-right shrink-0">
                      <div>Reviewed by {req.reviewed_by || 'Administrator'}</div>
                      <div>{req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : ''}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 p-3 sm:px-5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict enterprise allowlist active</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* SUB-MODAL: APPROVE DIALOG */}
        {approvingReq && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Approve & Grant Access</h4>
                    <p className="text-[11px] text-slate-500">{approvingReq.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setApprovingReq(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Select Functional Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as FunctionalRole)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-apollo"
                  >
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Optional Approval Note
                  </label>
                  <input
                    type="text"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="e.g., Regional sales manager covering Western corridor"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-apollo"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setApprovingReq(null)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    approveMutation.mutate({
                      id: approvingReq.id,
                      role: selectedRole,
                      notes: approvalNotes,
                    })
                  }
                  disabled={approveMutation.isPending}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Enroll</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: REJECT DIALOG */}
        {rejectingReq && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Decline Access Request</h4>
                    <p className="text-[11px] text-slate-500">{rejectingReq.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectingReq(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-semibold text-slate-700 block">
                  Decline Reason / Explanation
                </label>
                <input
                  type="text"
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="e.g., Only active internal Jet Freight sales personnel are eligible."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setRejectingReq(null)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    rejectMutation.mutate({
                      id: rejectingReq.id,
                      notes: rejectionNotes,
                    })
                  }
                  disabled={rejectMutation.isPending}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {rejectMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Decline Request</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL: ADD PERSONNEL DIRECTLY */}
        {showAddModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-apollo-700 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Add Personnel to Allowlist</h4>
                    <p className="text-[11px] text-slate-500">Authorize employee for passwordless sign-in</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Work Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="name@jfll.com"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-apollo"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Employee Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Ramesh Kulkarni"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-apollo"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Functional Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as FunctionalRole)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-apollo"
                    >
                      {AVAILABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newEmail.trim()) {
                      setAddError('Please enter a work email address.');
                      return;
                    }
                    addAllowlistMutation.mutate({
                      email: newEmail.trim(),
                      name: newName.trim(),
                      role: newRole,
                    });
                  }}
                  disabled={addAllowlistMutation.isPending || !newEmail.trim()}
                  className="flex-1 py-2 px-3 bg-apollo hover:bg-apollo-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {addAllowlistMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Add to Allowlist</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortalModal;
