export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
}

export interface AuthorizedUser {
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export const AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    email: 'tyra.theknath@jfll.com',
    name: 'Tyra Theknath',
    role: 'Leadership',
  },
  {
    email: 'deepak.naidu@jfll.com',
    name: 'Deepak Naidu',
    role: 'Tech Lead',
  },
  {
    email: 'akash.dhara@jfll.com',
    name: 'Akash Dhara',
    role: 'Operations',
  },
  {
    email: 'snehal.birje@jfll.com',
    name: 'Snehal Birje',
    role: 'Commercial',
  },
];
