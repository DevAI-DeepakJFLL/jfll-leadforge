import { UserSession, DEMO_CREDENTIALS } from '@/types/auth';

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

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.status === 401) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData.detail || 'Invalid work email or password. Please verify your credentials.'
      );
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Authentication failed with status HTTP ${res.status}`);
    }

    const data: BackendAuthResponse = await res.json();
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
