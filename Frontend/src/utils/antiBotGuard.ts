/**
 * Anti-Bot & Headless Browser Detection Guard
 * Protects Jet Freight Lead Forge from automated headless runners (Playwright, Puppeteer, Selenium, WebDriver)
 * and unauthorized browser agents.
 */

export interface BotDetectionResult {
  isBot: boolean;
  reason?: string;
}

/**
 * Inspects browser environment for tell-tale signatures of headless and automated engines.
 */
export function isAutomatedBrowser(): BotDetectionResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isBot: false };
  }

  // 1. Explicit navigator.webdriver flag (W3C standard automated browser flag)
  if (navigator.webdriver === true) {
    return { isBot: true, reason: 'navigator.webdriver flag is active' };
  }

  // 2. Global automation runtime objects injected by test frameworks
  const win = window as unknown as Record<string, unknown>;
  const automationArtifacts = [
    '__playwright__',
    '__pw_manualStatus__',
    '_phantom',
    '__nightmare',
    'callPhantom',
    '_selenium',
    '__selenium_unwrapped',
    'cdc_adoQpoasnfa76pfcZLmcfl_Array',
    'cdc_adoQpoasnfa76pfcZLmcfl_Promise',
  ];

  for (const artifact of automationArtifacts) {
    if (artifact in win) {
      return { isBot: true, reason: `Automation driver detected (${artifact})` };
    }
  }

  // 3. User-Agent explicit headless signature
  const ua = navigator.userAgent || '';
  if (/HeadlessChrome|PhantomJS|Electron/i.test(ua)) {
    return { isBot: true, reason: 'Headless User-Agent signature' };
  }

  // 4. Zero dimensions check (Headless Chrome typically has outerWidth/Height 0)
  if (
    typeof window.outerWidth !== 'undefined' &&
    typeof window.outerHeight !== 'undefined' &&
    window.outerWidth === 0 &&
    window.outerHeight === 0
  ) {
    return { isBot: true, reason: 'Zero display dimensions detected' };
  }

  // 5. Desktop Chrome plugins check
  // Regular desktop Chrome always registers plugins (PDF viewer, etc.). Standard headless Chrome has 0.
  const isChromeDesktop =
    /Chrome/i.test(ua) &&
    !/Mobile|Android|iPhone|iPad/i.test(ua) &&
    !/Edg/i.test(ua);

  if (isChromeDesktop && navigator.plugins && navigator.plugins.length === 0) {
    return { isBot: true, reason: 'Missing browser plugins profile' };
  }

  // 6. WebGL Software Rasterizer Inspection (Cloud VMs / Headless runners)
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        if (/SwiftShader|llvmpipe|Mesa OffScreen|Software/i.test(String(renderer))) {
          return { isBot: true, reason: `Software WebGL rasterizer detected (${renderer})` };
        }
      }
    }
  } catch {
    // Ignore WebGL detection error in environments where canvas is disabled
  }

  return { isBot: false };
}

/**
 * Replaces the entire DOM with an enterprise Security Access Denied block screen.
 * Halts React execution and prevents unauthorized headless interaction.
 */
export function renderBotBlockScreen(reason?: string): void {
  if (typeof document === 'undefined') return;

  document.title = 'Access Restricted · Jet Freight Security';

  const container = document.createElement('div');
  container.id = 'security-guard-block-screen';
  container.setAttribute(
    'style',
    'position:fixed;inset:0;background:#090d16;color:#ffffff;display:flex;align-items:center;justify-content:center;z-index:99999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box;'
  );

  container.innerHTML = `
    <div style="max-width:540px;background:#111827;border:1px solid #dc2626;border-radius:16px;padding:36px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);text-align:center;">
      <div style="width:64px;height:64px;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#f87171;margin:0 0 12px;letter-spacing:-0.02em;">
        Automated Browser Agent Prohibited
      </h1>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 20px;">
        Jet Freight Lead Forge has detected an automated browser environment or headless agent.
        To safeguard proprietary customs intelligence and client records, programmatic browser operations are restricted.
      </p>
      ${
        reason
          ? `<div style="font-size:11px;font-family:monospace;background:#1f2937;color:#fca5a5;padding:8px 12px;border-radius:8px;margin-bottom:20px;word-break:break-all;">Detection: ${reason}</div>`
          : ''
      }
      <div style="border-top:1px solid #374151;padding-top:20px;font-size:12px;color:#6b7280;line-height:1.5;">
        Please launch this portal in a standard, interactive desktop browser (Chrome, Safari, Edge, Firefox).
      </div>
    </div>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(container);
}
