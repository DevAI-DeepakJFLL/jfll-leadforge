import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loginUser } from '@/services/authService';
import { AUTHORIZED_USERS } from '@/types/auth';

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
    }
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
});
