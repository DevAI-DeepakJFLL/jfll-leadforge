import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isAutomatedBrowser,
  getDeviceFingerprint,
  poisonMachineStorage,
  clearMachinePoisonPill,
  isMachineLocallyPoisoned,
  checkDeviceStatusOnline,
  renderBotBlockScreen,
  BAN_STORAGE_KEY,
} from '@/utils/antiBotGuard';

describe('Anti-Bot & Headless Browser Detection Guard', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key of Object.keys(mockLocalStorage)) {
      delete mockLocalStorage[key];
    }

    (globalThis as unknown as { window: unknown }).window = {
      outerWidth: 1440,
      outerHeight: 900,
      localStorage: {
        getItem: (k: string) => mockLocalStorage[k] || null,
        setItem: (k: string, v: string) => {
          mockLocalStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockLocalStorage[k];
        },
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
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

  it('generates a deterministic device hardware fingerprint', () => {
    const fp = getDeviceFingerprint();
    expect(fp).toBeDefined();
    expect(fp.startsWith('fp_')).toBe(true);
  });

  it('poisons machine storage and detects locally poisoned machine', () => {
    expect(isMachineLocallyPoisoned()).toBe(false);
    poisonMachineStorage();
    expect(isMachineLocallyPoisoned()).toBe(true);
    expect(mockLocalStorage[BAN_STORAGE_KEY]).toBe('true');

    // Even if other bot indicators are false, poisoned machine is blocked
    const res = isAutomatedBrowser();
    expect(res.isBot).toBe(true);
    expect(res.reason).toContain('permanently restricted');
  });

  it('detects when navigator.webdriver is true and auto-poisons storage', () => {
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      configurable: true,
      writable: true,
    });

    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(true);
    expect(result.reason).toContain('navigator.webdriver');
    expect(isMachineLocallyPoisoned()).toBe(true);
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

  it('allows clearing the poison pill via clearMachinePoisonPill', () => {
    poisonMachineStorage();
    expect(isMachineLocallyPoisoned()).toBe(true);
    clearMachinePoisonPill();
    expect(isMachineLocallyPoisoned()).toBe(false);
  });

  it('passes on legitimate unautomated browser environment', () => {
    const result = isAutomatedBrowser();
    expect(result.isBot).toBe(false);
  });

  it('does NOT allow unauthorized user self-unban via URL query parameter', () => {
    poisonMachineStorage();
    expect(isMachineLocallyPoisoned()).toBe(true);

    // Simulated URL with ?unban=1
    (globalThis.window as unknown as { location: { search: string } }).location = {
      search: '?unban=1',
    };

    const result = isAutomatedBrowser();
    // Must remain blocked! Admin can only remove the restriction.
    expect(result.isBot).toBe(true);
    expect(isMachineLocallyPoisoned()).toBe(true);
  });

  it('checks online device status against administrator records', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fingerprint: 'fp_123', blocked: false }),
    });
    (globalThis as unknown as { fetch: unknown }).fetch = mockFetch;

    const res = await checkDeviceStatusOnline('fp_123');
    expect(res.blocked).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/device-status?fingerprint=fp_123'), expect.any(Object));
  });

  it('renders enterprise block screen with Device Reference ID and Verify button', () => {
    const mockElements: Record<string, any> = {};
    const createElement = (tag: string) => {
      let _id = '';
      const el: any = {
        tag,
        attributes: {} as Record<string, string>,
        style: {} as Record<string, string>,
        children: [] as any[],
        setAttribute: (k: string, v: string) => {
          el.attributes[k] = v;
          if (k === 'id') {
            el.id = v;
          }
        },
        appendChild: (child: any) => {
          el.children.push(child);
        },
        get textContent() {
          let txt = el._textContent || '';
          for (const c of el.children) {
            txt += ' ' + (c.textContent || '');
          }
          return txt;
        },
        set textContent(val: string) {
          el._textContent = val;
        },
      };
      Object.defineProperty(el, 'id', {
        get: () => _id,
        set: (val: string) => {
          _id = val;
          mockElements[val] = el;
        },
      });
      return el;
    };

    (globalThis as unknown as { document: unknown }).document = {
      title: '',
      createElement,
      getElementById: (id: string) => mockElements[id] || null,
      body: {
        innerHTML: '',
        appendChild: (child: any) => {
          mockElements['body'] = child;
        },
      },
    };

    renderBotBlockScreen('Automated headless browser detected', 'fp_test_device_999');
    expect((globalThis as unknown as { document: { title: string } }).document.title).toContain('Access Restricted');
    const container = mockElements['security-guard-block-screen'];
    expect(container).toBeDefined();
    expect(container.textContent).toContain('Device Access Restricted');
    expect(container.textContent).toContain('fp_test_device_999');
    expect(container.textContent).toContain('Verify Restriction Status');
    // Ensure self-unban button is gone
    expect(container.textContent).not.toContain('Restore Browser Access');
  });
});
