export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
  isOffline?: boolean;
  requires_password_setup?: boolean;
  permissions?: string[];
}

export interface AuthorizedUser {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  defaultPassword?: string;
}

export const DEFAULT_DEMO_PASSWORD = 'JetFreight@2026!';

function resolveAuthorizedUsers(): AuthorizedUser[] {
  // 1. Resolve from secure build-time/local .env variables
  const envUsersRaw = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTHORIZED_USERS) as string | undefined;
  if (envUsersRaw) {
    try {
      const parsed = JSON.parse(envUsersRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u: AuthorizedUser) => ({
          ...u,
          defaultPassword: u.defaultPassword || DEFAULT_DEMO_PASSWORD,
        }));
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
        defaultPassword: DEFAULT_DEMO_PASSWORD,
      };
    });
  }

  // 2. Default enterprise roles for offline fallback (development and test environments only)
  // shortcut: do not bundle hardcoded executive directory into production client bundles
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD && !envEmailsRaw && !envUsersRaw) {
    return [];
  }

  return [
    {
      email: 'deepak@jfll.com',
      name: 'Deepak Naidu',
      role: 'Tech Lead',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
    {
      email: 'tyra.theknath@jfll.com',
      name: 'Tyra Theknath',
      role: 'Leadership',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
    {
      email: 'akash.dhara@jfll.com',
      name: 'Akash Dhara',
      role: 'Operations',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
    {
      email: 'snehal.birje@jfll.com',
      name: 'Snehal Birje',
      role: 'Commercial',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
    {
      email: 'admin@jfll.com',
      name: 'Administrator',
      role: 'Leadership',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
    {
      email: 'team@jfll.com',
      name: 'Operations Team',
      role: 'Operations',
      defaultPassword: DEFAULT_DEMO_PASSWORD,
    },
  ];
}

export const AUTHORIZED_USERS: AuthorizedUser[] = resolveAuthorizedUsers();
