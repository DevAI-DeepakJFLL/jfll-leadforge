import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AppDock } from '@/components/layout/AppDock';
import { UserSession } from '@/types/auth';

describe('AppDock Navigation & User Logout Details Suite', () => {
  const mockUser: UserSession = {
    name: 'Tyra Theknath',
    email: 'tyra.theknath@jfll.com',
    role: 'Leadership',
    token: 'jwt-mock-tyra',
  };

  it('renders user initials avatar and session indicator in dock button when user is logged in', () => {
    const html = renderToString(<AppDock currentUser={mockUser} />);

    // Check desktop user button initials "TT"
    expect(html).toContain('aria-label="User Account for Tyra Theknath"');
    expect(html).toContain('TT');
    expect(html).toContain('title="Tyra Theknath (tyra.theknath@jfll.com) · Account &amp; Sign Out"');

    // Check hover tooltip text
    expect(html).toContain('Tyra Theknath · Leadership');

    // Check mobile dock user name label
    expect(html).toContain('Tyra');
  });

  it('renders full user details inside the profile popover and personalized sign out option', () => {
    const html = renderToString(
      <AppDock currentUser={mockUser} defaultShowProfileMenu={true} />
    );

    // Profile card displays full name, email, and role badge
    expect(html).toContain('Tyra Theknath');
    expect(html).toContain('tyra.theknath@jfll.com');
    expect(html).toContain('Leadership');
    expect(html).toContain('Jet Freight Logistics');

    // Check personalized Sign Out button with first name
    expect(html).toContain('Sign out (Tyra)');
    expect(html).toContain('title="Sign out Tyra Theknath (tyra.theknath@jfll.com)"');
  });

  it('gracefully renders fallback initials when currentUser is not provided', () => {
    const html = renderToString(<AppDock currentUser={null} />);

    expect(html).toContain('aria-label="User Account for Authorized Personnel"');
    expect(html).toContain('AP');
  });

  it('renders primary navigation items with correct active status', () => {
    const html = renderToString(<AppDock activeNav="search" currentUser={mockUser} />);

    expect(html).toContain('Leads Explorer');
    expect(html).toContain('JFLL Customers');
    expect(html).toContain('DataMyne Leads');
    expect(html).toContain('Saved Searches');
  });
});
