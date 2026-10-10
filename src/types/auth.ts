export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  token: string;
}

// Enterprise test credentials for Jet Freight Logistics internal portal
export const DEMO_CREDENTIALS = {
  email: 'leads@jfll.com',
  password: 'Jet@123',
  name: 'JFLL',
  role: 'Internal Team',
};
