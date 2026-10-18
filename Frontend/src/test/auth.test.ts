import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loginUser } from '@/services/authService';
import { DEMO_CREDENTIALS } from '@/types/auth';

describe('authService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('authenticates successfully via backend API', async () => {
    const mockSessionResponse = {
      email: 'leads@jfll.com',
      name: 'JFLL',
      role: 'Internal Team',
      token: 'mock.signed.jwt.token',
      token_type: 'Bearer',
      expires_at: '2026-10-11T12:00:00Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await loginUser({
      email: 'leads@jfll.com',
      password: 'Jet@123',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'leads@jfll.com', password: 'Jet@123' }),
    });

    expect(session.email).toBe('leads@jfll.com');
    expect(session.name).toBe('JFLL');
    expect(session.role).toBe('Internal Team');
    expect(session.token).toBe('mock.signed.jwt.token');
  });

  it('throws error when backend returns 401 unauthorized', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid work email or password. Please verify your credentials.' }),
    });

    await expect(
      loginUser({
        email: 'leads@jfll.com',
        password: 'WrongPassword',
      })
    ).rejects.toThrow('Invalid work email or password. Please verify your credentials.');
  });

  it('falls back to demo credentials when backend is completely offline/unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const session = await loginUser({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    });

    expect(session.email).toBe(DEMO_CREDENTIALS.email);
    expect(session.name).toBe(DEMO_CREDENTIALS.name);
    expect(session.token).toContain('offline_session_');
  });

  it('rejects incorrect credentials even in offline fallback mode', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      loginUser({
        email: 'wrong@jfll.com',
        password: 'WrongPassword',
      })
    ).rejects.toThrow('Invalid work email or password');
  });
});
