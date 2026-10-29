import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AdminPortalModal } from '@/components/admin/AdminPortalModal';
import { AppDock } from '@/components/layout/AppDock';
import { ToastProvider } from '@/components/ui';
import { UserSession } from '@/types/auth';
import {
  submitAccessRequest,
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
});
