import { UserSession, AUTHORIZED_USERS } from '@/types/auth';
import { logger } from '@/utils/logger';
import { API_BASE_URL } from '@/config/api';

export interface LoginCredentials {
  email: string;
  password?: string;
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
      msg.includes('Invalid work email') ||
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

    throw new Error('Access restricted. Only authorized Jet Freight Logistics personnel can sign in.');
  }
}
