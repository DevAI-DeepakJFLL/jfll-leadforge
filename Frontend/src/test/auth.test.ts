import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loginUser,
  setUserPassword,
  hasUserPermission,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  isOfflineSession,
  checkSessionHeartbeat,
  notifySessionSuperseded,
  SESSION_SUPERSEDED_EVENT,
  AUTH_STORAGE_KEY,
} from '@/services/authService';
import { AUTHORIZED_USERS, UserSession } from '@/types/auth';

describe('authService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('authenticates successfully via backend API with Deepak Naidu', async () => {
    const mockSessionResponse = {
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'mock.signed.jwt.token',
      token_type: 'Bearer',
      expires_at: '2026-10-21T12:00:00Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await loginUser({
      email: 'deepak@jfll.com',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/login'), {
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: 'deepak@jfll.com' }),
    });

    expect(session.email).toBe('deepak@jfll.com');
    expect(session.name).toBe('Deepak Naidu');
    expect(session.role).toBe('Tech Lead');
    expect(session.token).toBe('mock.signed.jwt.token');
  });

  it('authenticates successfully via backend API with Tyra Theknath', async () => {
    const mockSessionResponse = {
      email: 'tyra.theknath@jfll.com',
      name: 'Tyra Theknath',
      role: 'Leadership',
      token: 'mock.tyra.jwt.token',
      token_type: 'Bearer',
      expires_at: '2026-10-21T12:00:00Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await loginUser({
      email: 'Tyra.Theknath@jfll.com', // test case-insensitivity
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/login'), {
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: 'tyra.theknath@jfll.com' }),
    });

    expect(session.email).toBe('tyra.theknath@jfll.com');
    expect(session.name).toBe('Tyra Theknath');
    expect(session.role).toBe('Leadership');
  });

  it('authenticates with password included in request payload', async () => {
    const mockSessionResponse = {
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'mock.signed.jwt.token',
      token_type: 'Bearer',
      expires_at: '2026-10-21T12:00:00Z',
      requires_password_setup: false,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await loginUser({
      email: 'deepak@jfll.com',
      password: 'Jet@123',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/login'), {
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: 'deepak@jfll.com', password: 'Jet@123' }),
    });

    expect(session.requires_password_setup).toBe(false);
  });

  it('correctly maps requires_password_setup flag from backend response', async () => {
    const mockSessionResponse = {
      email: 'newuser@jfll.com',
      name: 'New User',
      role: 'Commercial',
      token: 'mock.newuser.jwt.token',
      token_type: 'Bearer',
      expires_at: '2026-10-21T12:00:00Z',
      requires_password_setup: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await loginUser({
      email: 'newuser@jfll.com',
    });

    expect(session.requires_password_setup).toBe(true);
  });

  it('throws error when backend returns 401 unauthorized for unlisted email', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        detail: 'Access restricted. Only authorized Jet Freight Logistics personnel can sign in.',
      }),
    });

    await expect(
      loginUser({
        email: 'unauthorized@jfll.com',
      })
    ).rejects.toThrow('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');
  });

  it('falls back to authorized personnel when backend is completely offline/unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    for (const member of AUTHORIZED_USERS) {
      const session = await loginUser({
        email: member.email,
      });

      expect(session.email).toBe(member.email);
      expect(session.name).toBe(member.name);
      expect(session.role).toBe(member.role);
      expect(session.token).toContain('offline_session_');
      expect(session.isOffline).toBe(true);
      expect(isOfflineSession(session)).toBe(true);
    }
  });

  describe('isOfflineSession', () => {
    it('correctly identifies offline sessions by isOffline flag or token prefix', () => {
      expect(
        isOfflineSession({
          isOffline: true,
          token: 'some_token',
          email: 'test@jfll.com',
          name: 'Test',
          role: 'Staff',
        })
      ).toBe(true);
      expect(
        isOfflineSession({
          isOffline: false,
          token: 'offline_session_12345',
          email: 'test@jfll.com',
          name: 'Test',
          role: 'Staff',
        })
      ).toBe(true);
      expect(
        isOfflineSession({
          token: 'offline_session_99999',
          email: 'test@jfll.com',
          name: 'Test',
          role: 'Staff',
        })
      ).toBe(true);
    });

    it('returns false for regular online sessions', () => {
      expect(
        isOfflineSession({
          isOffline: false,
          token: 'valid.jwt.signature',
          email: 'test@jfll.com',
          name: 'Test',
          role: 'Staff',
        })
      ).toBe(false);
      expect(
        isOfflineSession({
          token: 'valid.jwt.signature',
          email: 'test@jfll.com',
          name: 'Test',
          role: 'Staff',
        })
      ).toBe(false);
    });

    it('returns false for null or undefined sessions', () => {
      expect(isOfflineSession(null)).toBe(false);
      expect(isOfflineSession(undefined)).toBe(false);
    });
  });

  it('strictly rejects unlisted emails in offline fallback mode', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      loginUser({
        email: 'outsider@example.com',
      })
    ).rejects.toThrow('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');

    await expect(
      loginUser({
        email: 'random.person@jfll.com',
      })
    ).rejects.toThrow('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');
  });

  describe('Session Storage Helpers', () => {
    const mockSession: UserSession = {
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      token: 'test-token',
    };

    let storageMap: Record<string, string> = {};

    beforeEach(() => {
      storageMap = {};
      const mockStorage = {
        getItem: (key: string) => storageMap[key] || null,
        setItem: (key: string, value: string) => {
          storageMap[key] = value;
        },
        removeItem: (key: string) => {
          delete storageMap[key];
        },
        clear: () => {
          storageMap = {};
        },
      };
      (globalThis as unknown as { window?: { sessionStorage: typeof mockStorage } }).window = {
        sessionStorage: mockStorage,
      };
    });

    afterEach(() => {
      delete (globalThis as unknown as { window?: unknown }).window;
    });

    it('persists and retrieves user session cleanly', () => {
      expect(getStoredSession()).toBeNull();
      setStoredSession(mockSession);
      const retrieved = getStoredSession();
      expect(retrieved).toEqual(mockSession);
      expect(storageMap[AUTH_STORAGE_KEY]).toBe(JSON.stringify(mockSession));
    });

    it('clears stored session on logout', () => {
      setStoredSession(mockSession);
      expect(getStoredSession()).not.toBeNull();
      clearStoredSession();
      expect(getStoredSession()).toBeNull();
      expect(storageMap[AUTH_STORAGE_KEY]).toBeUndefined();
    });

    it('gracefully handles corrupted sessionStorage JSON', () => {
      storageMap[AUTH_STORAGE_KEY] = '{ invalid_json :::';
      expect(getStoredSession()).toBeNull();
    });

    it('returns null safely when window is undefined', () => {
      delete (globalThis as unknown as { window?: unknown }).window;
      expect(getStoredSession()).toBeNull();
    });
  });

  describe('Session Heartbeat and Displacement', () => {
    let originalWindow: unknown;

    beforeEach(() => {
      originalWindow = (globalThis as unknown as { window?: unknown }).window;
      const eventTarget = new EventTarget();
      (globalThis as unknown as { window: unknown }).window = {
        addEventListener: eventTarget.addEventListener.bind(eventTarget),
        removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
        dispatchEvent: eventTarget.dispatchEvent.bind(eventTarget),
        location: { href: 'http://localhost:3000' },
      };
    });

    afterEach(() => {
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
    });

    it('returns active: true when session is valid and healthy', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'active', user: 'deepak@jfll.com' }),
      });

      const result = await checkSessionHeartbeat('valid.jwt.token');
      expect(result).toEqual({ active: true });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/heartbeat'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer valid.jwt.token' }),
        })
      );
    });

    it('returns active: false, superseded: true and dispatches event when displaced by another device', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'SESSION_SUPERSEDED: Your account was signed in from another device.',
        }),
      });

      let eventFired = false;
      const listener = () => {
        eventFired = true;
      };
      (globalThis as unknown as { window: EventTarget }).window.addEventListener(
        SESSION_SUPERSEDED_EVENT,
        listener as EventListener
      );

      const result = await checkSessionHeartbeat('displaced.jwt.token');
      expect(result).toEqual({ active: false, superseded: true });
      expect(eventFired).toBe(true);

      (globalThis as unknown as { window: EventTarget }).window.removeEventListener(
        SESSION_SUPERSEDED_EVENT,
        listener as EventListener
      );
    });

    it('rejects login with 403 when automated agent is detected by backend', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          detail: 'AUTOMATED_AGENT_BLOCKED: Headless browser agents are not permitted',
        }),
      });

      await expect(
        loginUser({ email: 'deepak@jfll.com' })
      ).rejects.toThrow('AUTOMATED_AGENT_BLOCKED');
    });

    it('dispatches SESSION_SUPERSEDED_EVENT via notifySessionSuperseded', () => {
      let notified = false;
      const listener = () => {
        notified = true;
      };
      (globalThis as unknown as { window: EventTarget }).window.addEventListener(
        SESSION_SUPERSEDED_EVENT,
        listener as EventListener
      );

      notifySessionSuperseded();
      expect(notified).toBe(true);

      (globalThis as unknown as { window: EventTarget }).window.removeEventListener(
        SESSION_SUPERSEDED_EVENT,
        listener as EventListener
      );
    });
  });

  describe('setUserPassword', () => {
    it('successfully calls set-password endpoint and stores active session', async () => {
      const mockSessionResponse = {
        email: 'snehal.birje@jfll.com',
        name: 'Snehal Birje',
        role: 'Commercial',
        token: 'new.jwt.token.after.password.set',
        token_type: 'Bearer',
        expires_at: '2026-10-22T12:00:00Z',
        requires_password_setup: false,
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSessionResponse,
      });

      const session = await setUserPassword('snehal.birje@jfll.com', 'NewSecurePass#2026');

      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/set-password'), {
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: 'snehal.birje@jfll.com',
          new_password: 'NewSecurePass#2026',
        }),
      });

      expect(session.email).toBe('snehal.birje@jfll.com');
      expect(session.requires_password_setup).toBe(false);
      expect(getStoredSession()?.email).toBe('snehal.birje@jfll.com');
    });

    it('rejects password setup when password is too short', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          detail: 'Password must be at least 6 characters long.',
        }),
      });

      await expect(
        setUserPassword('deepak@jfll.com', 'short')
      ).rejects.toThrow('Password must be at least 6 characters long.');
    });

    it('rejects password setup when email is unauthorized', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          detail: 'Access restricted. Only authorized Jet Freight Logistics personnel can set a password.',
        }),
      });

      await expect(
        setUserPassword('outsider@example.com', 'ValidPassword123!')
      ).rejects.toThrow('Access restricted. Only authorized Jet Freight Logistics personnel can set a password.');
    });
  });

  describe('hasUserPermission', () => {
    it('returns false when session or role is missing', () => {
      expect(hasUserPermission(null, 'view_leads')).toBe(false);
      expect(hasUserPermission(undefined as unknown as UserSession, 'view_leads')).toBe(false);
      expect(hasUserPermission({ email: 'a@jfll.com', name: 'A', role: '', token: '' }, 'view_leads')).toBe(false);
    });

    it('grants all permissions to Root Admin and Tech Lead', () => {
      const techLead: UserSession = { email: 'deepak@jfll.com', name: 'Deepak', role: 'Tech Lead', token: 'tok' };
      const rootAdmin: UserSession = { email: 'admin@jfll.com', name: 'Admin', role: 'Root Admin', token: 'tok' };

      const permissions = [
        'view_leads',
        'export_csv',
        'export_docx',
        'log_approach',
        'enrich_web',
        'admin_portal',
        'manage_users',
      ];

      for (const p of permissions) {
        expect(hasUserPermission(techLead, p)).toBe(true);
        expect(hasUserPermission(rootAdmin, p)).toBe(true);
      }
    });

    it('grants Leadership all permissions except user management', () => {
      const leadership: UserSession = { email: 'tyra.theknath@jfll.com', name: 'Tyra', role: 'Leadership', token: 'tok' };

      expect(hasUserPermission(leadership, 'view_leads')).toBe(true);
      expect(hasUserPermission(leadership, 'export_csv')).toBe(true);
      expect(hasUserPermission(leadership, 'export_docx')).toBe(true);
      expect(hasUserPermission(leadership, 'log_approach')).toBe(true);
      expect(hasUserPermission(leadership, 'enrich_web')).toBe(true);
      expect(hasUserPermission(leadership, 'admin_portal')).toBe(true);
      expect(hasUserPermission(leadership, 'manage_users')).toBe(false);
    });

    it('strictly restricts Viewer role from export, log approach, web enrichment, and admin privileges', () => {
      const viewer: UserSession = { email: 'viewer@jfll.com', name: 'Viewer User', role: 'Viewer', token: 'tok' };

      expect(hasUserPermission(viewer, 'view_leads')).toBe(true);
      expect(hasUserPermission(viewer, 'export_csv')).toBe(false);
      expect(hasUserPermission(viewer, 'export_docx')).toBe(false);
      expect(hasUserPermission(viewer, 'log_approach')).toBe(false);
      expect(hasUserPermission(viewer, 'enrich_web')).toBe(false);
      expect(hasUserPermission(viewer, 'admin_portal')).toBe(false);
      expect(hasUserPermission(viewer, 'manage_users')).toBe(false);
    });

    it('allows standard operations for Commercial and Operations roles', () => {
      const commercial: UserSession = { email: 'snehal.birje@jfll.com', name: 'Snehal', role: 'Commercial', token: 'tok' };

      expect(hasUserPermission(commercial, 'view_leads')).toBe(true);
      expect(hasUserPermission(commercial, 'log_approach')).toBe(true);
      expect(hasUserPermission(commercial, 'export_csv')).toBe(true);
      expect(hasUserPermission(commercial, 'admin_portal')).toBe(false);
      expect(hasUserPermission(commercial, 'manage_users')).toBe(false);
    });

    it('respects explicit permissions array if provided in user session', () => {
      const customUser: UserSession = {
        email: 'custom@jfll.com',
        name: 'Custom Staff',
        role: 'Auditor',
        token: 'tok',
        permissions: ['view_leads', 'export_csv'],
      };

      expect(hasUserPermission(customUser, 'view_leads')).toBe(true);
      expect(hasUserPermission(customUser, 'export_csv')).toBe(true);
      expect(hasUserPermission(customUser, 'log_approach')).toBe(false);
    });
  });
});
