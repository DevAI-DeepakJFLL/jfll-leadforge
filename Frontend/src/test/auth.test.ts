import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loginUser,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  isOfflineSession,
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
      email: 'deepak.naidu@jfll.com',
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
      email: 'deepak.naidu@jfll.com',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'deepak.naidu@jfll.com' }),
    });

    expect(session.email).toBe('deepak.naidu@jfll.com');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tyra.theknath@jfll.com' }),
    });

    expect(session.email).toBe('tyra.theknath@jfll.com');
    expect(session.name).toBe('Tyra Theknath');
    expect(session.role).toBe('Leadership');
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
      email: 'deepak.naidu@jfll.com',
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
});
