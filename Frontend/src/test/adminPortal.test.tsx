import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdminPortalModal } from '@/components/admin/AdminPortalModal';
import { AppDock } from '@/components/layout/AppDock';
import { ToastProvider } from '@/components/ui';
import { UserSession } from '@/types/auth';
import { setStoredSession, clearStoredSession } from '@/services/authService';
import {
  submitAccessRequest,
  fetchAccessRequests,
  fetchAdminStats,
  approveAccessRequest,
  rejectAccessRequest,
  fetchAllowlist,
  addAllowlistEntry,
  revokeAllowlistEntry,
} from '@/services/adminService';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('Root Admin Portal & Access Request Suite', () => {
  it('renders AdminPortalModal with title, tabs, and security badges when open', () => {
    const queryClient = createTestQueryClient();
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminPortalModal
            isOpen={true}
            onClose={() => {}}
            currentUserEmail="deepak@jfll.com"
          />
        </ToastProvider>
      </QueryClientProvider>
    );

    // Header & Titles
    expect(html).toContain('Root Administration Portal');
    expect(html).toContain('Access Master');
    expect(html).toContain('Manage employee email allowlist and review self-service access requests.');

    // Tabs
    expect(html).toContain('Pending Requests');
    expect(html).toContain('Active Allowlist');
    expect(html).toContain('Audit History');

    // Security Notice
    expect(html).toContain('Strict enterprise allowlist active');
  });

  it('does not render modal content when isOpen is false', () => {
    const queryClient = createTestQueryClient();
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AdminPortalModal
            isOpen={false}
            onClose={() => {}}
            currentUserEmail="deepak@jfll.com"
          />
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(html).toBe('');
  });

  it('renders Root Admin Portal launcher on AppDock for Admin/Leadership users', () => {
    const adminUser: UserSession = {
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'test_token',
    };

    const onOpenAdmin = vi.fn();
    const html = renderToString(
      <AppDock
        currentUser={adminUser}
        onOpenAdminPortal={onOpenAdmin}
        pendingRequestsCount={3}
      />
    );

    expect(html).toContain('aria-label="Root Administration Portal"');
    expect(html).toContain('Admin Portal');
    expect(html).toContain('(3 pending)');
  });

  it('does NOT render Root Admin Portal launcher on AppDock for non-admin commercial users', () => {
    const commercialUser: UserSession = {
      email: 'sales.rep@jfll.com',
      name: 'Sales Rep',
      role: 'Commercial',
      token: 'test_token',
    };

    const html = renderToString(
      <AppDock
        currentUser={commercialUser}
        onOpenAdminPortal={() => {}}
        pendingRequestsCount={0}
      />
    );

    expect(html).not.toContain('aria-label="Root Administration Portal"');
  });

  it('adminService handles offline allowlist queries and access requests gracefully', async () => {
    // 1. Fetch initial allowlist
    const allowlist = await fetchAllowlist();
    expect(allowlist.length).toBeGreaterThanOrEqual(4);
    expect(allowlist.some((a) => a.email === 'deepak@jfll.com')).toBe(true);

    // 2. Submit access request for an already authorized user
    const resAuth = await submitAccessRequest({
      email: 'deepak@jfll.com',
      reason: 'Already authorized',
    });
    expect(resAuth.already_authorized).toBe(true);

    // 3. Submit request for new candidate
    const resNew = await submitAccessRequest({
      email: 'candidate.user@jfll.com',
      name: 'Candidate User',
      reason: 'Automotive freight sales for Pune region',
    });
    expect(resNew.success).toBe(true);
    expect(resNew.request?.email).toBe('candidate.user@jfll.com');
    expect(resNew.request?.status).toBe('pending');

    // 4. Duplicate request returns already pending
    const resDup = await submitAccessRequest({
      email: 'candidate.user@jfll.com',
      reason: 'Second attempt',
    });
    expect(resDup.already_pending).toBe(true);

    // 5. Add personnel directly to allowlist
    const addRes = await addAllowlistEntry({
      email: 'direct.add@jfll.com',
      name: 'Direct Add',
      role: 'Commercial',
    });
    expect(addRes.success).toBe(true);
    expect(addRes.entry.email).toBe('direct.add@jfll.com');

    // 6. Revoke personnel
    const revRes = await revokeAllowlistEntry('direct.add@jfll.com');
    expect(revRes.success).toBe(true);
    expect(revRes.entry.status).toBe('revoked');

    // 7. Safety: Prevent revoking root administrator
    await expect(revokeAllowlistEntry('deepak@jfll.com')).rejects.toThrow(
      'Root administrator account'
    );
  });

  it('persists declined access requests across reload and signout without reverting to pending', async () => {
    // 1. Establish admin session
    setStoredSession({
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'valid_test_token',
    });

    // 2. Submit candidate request
    const candidateEmail = 'decline.test@jfll.com';
    const subRes = await submitAccessRequest({
      email: candidateEmail,
      name: 'Decline Candidate',
      reason: 'Regional warehouse testing',
    });
    expect(subRes.success).toBe(true);
    expect(subRes.request?.id).toBeDefined();
    const reqId = subRes.request!.id;

    // 3. Verify it shows as pending in admin stats
    const statsBefore = await fetchAdminStats();
    const pendingCountBefore = statsBefore.pending_requests_count;
    expect(pendingCountBefore).toBeGreaterThanOrEqual(1);

    const pendingListBefore = await fetchAccessRequests('pending');
    expect(pendingListBefore.some((r) => r.id === reqId && r.status === 'pending')).toBe(true);

    // 4. Admin declines the request
    const rejectRes = await rejectAccessRequest(reqId, {
      notes: 'Territory already covered by senior rep.',
    });
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.request.status).toBe('rejected');
    expect(rejectRes.request.review_notes).toBe('Territory already covered by senior rep.');

    // 5. Verify pending count is decremented and request is in rejected list
    const statsAfter = await fetchAdminStats();
    expect(statsAfter.pending_requests_count).toBe(pendingCountBefore - 1);
    const pendingListAfter = await fetchAccessRequests('pending');
    expect(pendingListAfter.some((r) => r.id === reqId)).toBe(false);

    const rejectedList = await fetchAccessRequests('rejected');
    expect(rejectedList.some((r) => r.id === reqId && r.status === 'rejected')).toBe(true);

    // 6. Simulate SIGN OUT: stats should return 0 pending counts when logged out
    clearStoredSession();
    const loggedOutStats = await fetchAdminStats();
    expect(loggedOutStats.pending_requests_count).toBe(0);

    // 7. Simulate SIGN IN / RELOAD: status MUST remain 'rejected', not revert to 'pending'
    setStoredSession({
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'valid_test_token',
    });

    const reloadedRequests = await fetchAccessRequests('all');
    const persistedReq = reloadedRequests.find((r) => r.id === reqId);
    expect(persistedReq).toBeDefined();
    expect(persistedReq?.status).toBe('rejected');

    const reloadedStats = await fetchAdminStats();
    expect(reloadedStats.pending_requests_count).toBe(pendingCountBefore - 1);
    expect(reloadedRequests.filter((r) => r.status === 'pending').some((r) => r.id === reqId)).toBe(
      false
    );

    // Cleanup session
    clearStoredSession();
  });

  it('persists approved access requests and enrolls candidate into active allowlist', async () => {
    // 1. Establish admin session
    setStoredSession({
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'valid_test_token',
    });

    // 2. Submit candidate request
    const approvedEmail = 'approval.test@jfll.com';
    const subRes = await submitAccessRequest({
      email: approvedEmail,
      name: 'Approved Candidate',
      reason: 'Special projects manager',
    });
    expect(subRes.success).toBe(true);
    const reqId = subRes.request!.id;

    // 3. Admin approves the request
    const approveRes = await approveAccessRequest(reqId, {
      role: 'Commercial',
      notes: 'Approved for Western region accounts.',
    });
    expect(approveRes.success).toBe(true);
    expect(approveRes.request.status).toBe('approved');

    // 4. Verify candidate is now present in active allowlist
    const allowlist = await fetchAllowlist('active');
    const candidateEntry = allowlist.find((a) => a.email.toLowerCase() === approvedEmail);
    expect(candidateEntry).toBeDefined();
    expect(candidateEntry?.status).toBe('active');
    expect(candidateEntry?.role).toBe('Commercial');

    // Cleanup session
    clearStoredSession();
  });
});
