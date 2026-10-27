export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
  isOffline?: boolean;
}

export interface AuthorizedUser {
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

function resolveAuthorizedUsers(): AuthorizedUser[] {
  // 1. Resolve from secure build-time/local .env variables
  const envUsersRaw = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTHORIZED_USERS) as string | undefined;
  if (envUsersRaw) {
    try {
      const parsed = JSON.parse(envUsersRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback
    }
  }

  const envEmailsRaw = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALLOWED_EMAILS) as string | undefined;
  if (envEmailsRaw) {
    return envEmailsRaw.split(',').map((item) => {
      const email = item.trim().toLowerCase();
      const derivedName = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        email,
        name: derivedName || 'Internal Team Member',
        role: 'Internal Team',
      };
    });
  }

  // 2. Default enterprise roles for offline fallback
  return [
    {
      email: 'admin@jfll.com',
      name: 'Administrator',
      role: 'Leadership',
    },
    {
      email: 'team@jfll.com',
      name: 'Operations Team',
      role: 'Operations',
    },
  ];
}

export const AUTHORIZED_USERS: AuthorizedUser[] = resolveAuthorizedUsers();
