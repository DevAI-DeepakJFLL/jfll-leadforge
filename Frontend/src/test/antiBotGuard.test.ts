import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAutomatedBrowser } from '@/utils/antiBotGuard';

describe('Anti-Bot & Headless Browser Detection Guard', () => {
  beforeEach(() => {
    (globalThis as unknown as { window: unknown }).window = {
      outerWidth: 1440,
      outerHeight: 900,
    };
    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'plugins', {
      value: [{ name: 'Chrome PDF Viewer' }],
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'webdriver', {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  it('detects when navigator.webdriver is true', () => {
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      configurable: true,
      writable: true,
    });

    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('navigator.webdriver');
  });

  it('detects global automation driver artifacts (e.g. __playwright__)', () => {
    (globalThis.window as unknown as Record<string, unknown>).__playwright__ = true;
    try {
      const result = isAutomatedBrowser();
      expect(result.isBot).toBe(true);
      expect(result.reason).toContain('__playwright__');
    } finally {
      delete (globalThis.window as unknown as Record<string, unknown>).__playwright__;
    }
  });

  it('detects headless User-Agent string', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0 Safari/537.36',
      configurable: true,
      writable: true,
    });

    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Headless User-Agent');
  });

  it('detects zero display dimensions typical of headless runtimes', () => {
    (globalThis.window as { outerWidth: number; outerHeight: number }).outerWidth = 0;
    (globalThis.window as { outerWidth: number; outerHeight: number }).outerHeight = 0;

    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('Zero display dimensions');
  });

  it('passes on legitimate unautomated browser environment', () => {
    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(false);
  });
});
