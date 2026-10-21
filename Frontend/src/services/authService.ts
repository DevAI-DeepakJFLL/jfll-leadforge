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

const DEFAULT_AUTHORIZED_DIGESTS: Record<string, { name: string; role: string }> = {
  // Tyra Theknath
  '0f1b6d2600c03c27cdca25ea523982fe047b6e332ce1479cfa8fedd0f04fe478': {
    name: 'Tyra Theknath',
    role: 'Leadership',
  },
  // Deepak Naidu
  '2d2ba0c4e282c910ae3d73075667bafdc678a45e181c6124f3d22890d90d61b4': {
    name: 'Deepak Naidu',
    role: 'Tech Lead',
  },
  // Akash Dhara
  'c784d6a18385d82a93e4017eee6d64a3c03b196e3d080a46e73bfb5b717c80be': {
    name: 'Akash Dhara',
    role: 'Operations',
  },
  // Snehal Birje
  '6c94ee02a8480810b2daff09013956d2def3ff2b90baf3c18f4f7a3ae53a9f59': {
    name: 'Snehal Birje',
    role: 'Commercial',
  },
};

async function getSha256Digest(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fallback
    }
  }
  return '';
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

    if (res.status === 401) {
      const errData = await res.json().catch(() => ({}));
      const message =
        errData.detail || 'Access restricted. Only authorized Jet Freight Logistics personnel can sign in.';
      logger.warn('AUTH', 'Authentication rejected: Unauthorized work email', {
        email: normalizedEmail,
        status: 401,
      });
      throw new Error(message);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.detail || `Authentication failed with status HTTP ${res.status}`;
      logger.error('AUTH', 'Authentication server error', undefined, {
        email: normalizedEmail,
        status: res.status,
      });
      throw new Error(message);
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
    const msg = (err as Error)?.message || '';
    if (
      msg.includes('Access restricted') ||
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
        email: matchingUser.email,
        name: matchingUser.name,
        role: matchingUser.role,
        token: `offline_session_${Date.now()}`,
      };
    }

    const digest = await getSha256Digest(normalizedEmail);
    const digestMatch = DEFAULT_AUTHORIZED_DIGESTS[digest];
    if (digestMatch) {
      return {
        email: normalizedEmail,
        name: digestMatch.name,
        role: digestMatch.role,
        token: `offline_session_${Date.now()}`,
      };
    }

    throw new Error('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');
  }
}
