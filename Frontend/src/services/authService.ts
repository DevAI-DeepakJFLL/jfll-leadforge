import { UserSession, AUTHORIZED_USERS } from '@/types/auth';
import { logger } from '@/utils/logger';
import { API_BASE_URL } from '@/config/api';

export interface LoginCredentials {
  email: string;
  password?: string;
}

export const AUTH_STORAGE_KEY = 'apollo_leads_session';

export const DEFAULT_ANONYMOUS_SESSION: UserSession = {
  name: 'Authorized Personnel',
  email: 'user@jfll.com',
  role: 'Team Member',
  token: '',
};

/**
 * Retrieves the persisted UserSession from browser storage safely.
 */
export function getStoredSession(): UserSession | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    // Graceful handling of storage access exceptions
  }
  return null;
}

/**
 * Determines whether a session was created in offline fallback mode.
 */
export function isOfflineSession(session?: UserSession | null): boolean {
  return Boolean(session?.isOffline || session?.token?.startsWith('offline_session_'));
}

/**
 * Persists active UserSession to browser storage safely.
 */
export function setStoredSession(session: UserSession): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Graceful handling of storage access exceptions
  }
}

/**
 * Clears persisted UserSession from browser storage safely upon logout.
 */
export function clearStoredSession(): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Graceful handling of storage access exceptions
  }
}

export interface BackendAuthResponse {
  email: string;
  name: string;
  role: string;
  token: string;
  token_type?: string;
  expires_at?: string;
}

export class AuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authenticates user work email against the Backend AWS/REST API.
 * Gracefully falls back to offline authorized enterprise credentials if backend is completely unreachable.
 */
export async function loginUser(credentials: LoginCredentials): Promise<UserSession> {
  const normalizedEmail = credentials.email.trim().toLowerCase();
  const startTime = performance.now();
  logger.info('AUTH', 'Initiating user authentication', { email: normalizedEmail });

  try {
    const payload: { email: string; password?: string } = { email: normalizedEmail };
    if (credentials.password) {
      payload.password = credentials.password;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const durationMs = performance.now() - startTime;
    logger.apiCall('POST', '/api/v1/auth/login', durationMs, res.status);

    if (res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      const message =
        errData.detail || 'Access forbidden: Automated browser agents and headless environments are not permitted.';
      logger.warn('AUTH', 'Authentication rejected: Automated agent detected', {
        email: normalizedEmail,
        status: 403,
      });
      throw new AuthError(message, 403);
    }

    if (res.status === 401) {
      const errData = await res.json().catch(() => ({}));
      const message =
        errData.detail || 'Access restricted. Only authorized Jet Freight Logistics personnel can sign in.';
      logger.warn('AUTH', 'Authentication rejected: Unauthorized work email', {
        email: normalizedEmail,
        status: 401,
      });
      throw new AuthError(message, 401);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.detail || `Authentication failed with status HTTP ${res.status}`;
      logger.error('AUTH', 'Authentication server error', undefined, {
        email: normalizedEmail,
        status: res.status,
      });
      throw new AuthError(message, res.status);
    }

    const data: BackendAuthResponse = await res.json();
    logger.info('AUTH', 'Authentication successful', {
      email: data.email,
      role: data.role,
      tokenIssued: !!data.token,
    });

    return {
      email: data.email,
      name: data.name,
      role: data.role,
      token: data.token,
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      throw err;
    }

    const msg = (err as Error)?.message || '';
    if (
      msg.includes('Access restricted') ||
      msg.includes('Access forbidden') ||
      msg.includes('AUTOMATED_AGENT_BLOCKED') ||
      msg.includes('Automated browser agents') ||
      msg.includes('Authentication failed with status HTTP')
    ) {
      throw err;
    }

    console.warn('[AuthService] Backend API unreachable, checking offline enterprise credentials:', err);
    const matchingUser = AUTHORIZED_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (matchingUser) {
      return {
        ...matchingUser,
        token: `offline_session_${Date.now()}`,
        isOffline: true,
      };
    }

    throw new Error('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');
  }
}

/**
 * Custom event name fired when the active session is superseded by another device.
 */
export const SESSION_SUPERSEDED_EVENT = 'leadforge:session-superseded';

export function notifySessionSuperseded(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(SESSION_SUPERSEDED_EVENT));
  }
}

export interface SessionHeartbeatResult {
  active: boolean;
  superseded?: boolean;
}

/**
 * Proactively verifies with the backend that this browser's session is still the single active session.
 * If another device has logged in with the same account, returns { active: false, superseded: true }.
 */
export async function checkSessionHeartbeat(token: string): Promise<SessionHeartbeatResult> {
  if (!token || token.startsWith('offline_session_')) {
    return { active: true };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/heartbeat`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      return { active: true };
    }

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      if (typeof data.detail === 'string' && data.detail.startsWith('SESSION_SUPERSEDED')) {
        clearStoredSession();
        notifySessionSuperseded();
        return { active: false, superseded: true };
      }
      return { active: false };
    }

    return { active: true };
  } catch {
    // If backend network is momentarily unreachable, do not disrupt active user work
    return { active: true };
  }
}
