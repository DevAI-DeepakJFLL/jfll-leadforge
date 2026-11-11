import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LoginPage } from '@/components/auth/LoginPage';
import { AUTHORIZED_USERS, DEFAULT_DEMO_PASSWORD } from '@/types/auth';

describe('LoginPage UI Component', () => {
  it('renders modern authentication form with work email and password inputs', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    // Check header & greeting
    expect(html).toContain('Welcome back');
    expect(html).toContain('Authorized Personnel Sign-In');
    expect(html).toContain('Sign in with your registered work email and password.');

    // Check work email field
    expect(html).toContain('Work Email Address');
    expect(html).toContain('id="work-email-input"');
    expect(html).toContain('placeholder="name@jfll.com"');

    // Check account password field and show/hide toggle
    expect(html).toContain('Account Password');
    expect(html).toContain('id="password-input"');
    expect(html).toContain('type="password"');
    expect(html).toContain('placeholder="••••••••••••"');
    expect(html).toContain('aria-label="Show password"');

    // Check default password hint is not exposed
    expect(html).not.toContain(DEFAULT_DEMO_PASSWORD);

    // Check primary CTA
    expect(html).toContain('Sign In to Dashboard');
  });

  it('renders demo quick-fill pill buttons for seeded team members', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    expect(html).toContain('Demo Accounts:');

    // Check seeded team members from AUTHORIZED_USERS are present
    const demoMembers = AUTHORIZED_USERS.slice(0, 4);
    for (const member of demoMembers) {
      expect(html).toContain(member.name);
      expect(html).toContain(member.role);
    }
  });

  it('renders official brand elements and enterprise security notices', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    expect(html).toContain('Jet Freight Logistics');
    expect(html).toContain('Proprietary Sourcing Suite');
    expect(html).toContain('Lead Sourcing Dashboard');
    expect(html).toContain('Enterprise authentication · 256-bit signed session');
    expect(html).toContain('Authorized Personnel Only');

    // Verify dual-mode switcher and request access trigger
    expect(html).toContain('Sign In');
    expect(html).toContain('Request Access');
    expect(html).toContain('Don&#x27;t have access?');
    expect(html).toContain('Request Application Access');
  });
});
