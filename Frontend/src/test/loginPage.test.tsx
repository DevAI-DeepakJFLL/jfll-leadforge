import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LoginPage } from '@/components/auth/LoginPage';
import { AUTHORIZED_USERS } from '@/types/auth';

describe('LoginPage UI Component', () => {
  it('renders passwordless authentication form with quick select member chips', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    // Check header & title
    expect(html).toContain('Welcome back');
    expect(html).toContain('Authorized Personnel Sign-In');

    // Check all 4 authorized team members are rendered as quick-select chips
    for (const member of AUTHORIZED_USERS) {
      expect(html).toContain(member.name);
      expect(html).toContain(member.role);
    }
    expect(html).toContain('Tyra Theknath');
    expect(html).toContain('Deepak Naidu');
    expect(html).toContain('Akash Dhara');
    expect(html).toContain('Snehal Birje');

    // Check work email input exists
    expect(html).toContain('Work Email Address');
    expect(html).toContain('placeholder="deepak.naidu@jfll.com"');

    // Check primary CTA
    expect(html).toContain('Verify Work Email &amp; Enter');

    // Verify password field is completely absent
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain('Case-sensitive');
    expect(html).not.toContain('••••••••••••');
  });

  it('renders brand elements and security notices', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    expect(html).toContain('Jet Freight Logistics');
    expect(html).toContain('Passwordless whitelist authentication');
    expect(html).toContain('4 Authorized Personnel');
  });
});
