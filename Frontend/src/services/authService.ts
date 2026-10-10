import { UserSession, DEMO_CREDENTIALS } from '@/types/auth';
import { logger } from '@/utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
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
 * Authenticates user credentials against the Backend AWS/REST API.
 * Gracefully falls back to offline enterprise credentials if backend is completely unreachable.
 */
export async function loginUser(credentials: LoginCredentials): Promise<UserSession> {
  const { email, password } = credentials;
  const startTime = performance.now();
  logger.info('AUTH', 'Initiating user authentication', { email: email.trim() });

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    const durationMs = performance.now() - startTime;
    logger.apiCall('POST', '/api/v1/auth/login', durationMs, res.status);

    if (res.status === 401) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.detail || 'Invalid work email or password. Please verify your credentials.';
      logger.warn('AUTH', 'Authentication rejected: Invalid credentials', { email, status: 401 });
      throw new Error(message);
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData.detail || `Authentication failed with status HTTP ${res.status}`;
      logger.error('AUTH', 'Authentication server error', undefined, { email, status: res.status });
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
    if (msg.includes('Invalid work email or password')) {
      throw err;
    }

    console.warn('[AuthService] Backend API unreachable, checking offline enterprise credentials:', err);
    if (
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase() &&
      password === DEMO_CREDENTIALS.password
    ) {
      return {
        email: DEMO_CREDENTIALS.email,
        name: DEMO_CREDENTIALS.name,
        role: DEMO_CREDENTIALS.role,
        token: `offline_session_${Date.now()}`,
      };
    }
    throw new Error('Invalid work email or password. Please verify your credentials.');
  }
}
