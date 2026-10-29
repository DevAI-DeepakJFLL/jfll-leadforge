import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LoginPage } from '@/components/auth/LoginPage';
import { AUTHORIZED_USERS } from '@/types/auth';

describe('LoginPage UI Component', () => {
  it('renders clean passwordless authentication form without pre-filled details', () => {
    const html = renderToString(<LoginPage onLoginSuccess={() => {}} />);

    // Check header & title
    expect(html).toContain('Welcome back');
    expect(html).toContain('Authorized Personnel Sign-In');
    expect(html).toContain('Enter your registered work email to access the leads dashboard.');

    // Check that pre-filled member chips and personal names are NOT exposed on login screen
    for (const member of AUTHORIZED_USERS) {
      expect(html).not.toContain(member.name);
    }
    expect(html).not.toContain('Quick Select Team Member');

    // Check neutral work email input exists without pre-filled email
    expect(html).toContain('Work Email Address');
    expect(html).toContain('placeholder="name@jfll.com"');
    expect(html).not.toContain('placeholder="deepak.naidu@jfll.com"');

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
    expect(html).toContain('Authorized Personnel Only');

    // Verify dual-mode switcher and request access trigger
    expect(html).toContain('Sign In');
    expect(html).toContain('Request Access');
    expect(html).toContain('Not on the allowlist yet?');
    expect(html).toContain('Request Application Access');
  });
});
