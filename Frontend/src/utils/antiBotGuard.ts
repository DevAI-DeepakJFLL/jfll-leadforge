/**
 * Anti-Bot & Headless Browser Detection Guard
 * Protects Jet Freight Lead Forge from automated headless runners (Playwright, Puppeteer, Selenium, WebDriver)
 * and unauthorized browser agents.
 * Features persistent multi-storage machine banning and hardware fingerprinting.
 */

export interface BotDetectionResult {
  isBot: boolean;
  reason?: string;
  fingerprint?: string;
}

export const BAN_STORAGE_KEY = 'jfll_sec_machine_permanently_blocked';
export const BAN_COOKIE_NAME = 'jfll_machine_ban';

/**
 * Deterministically computes a hardware & runtime fingerprint of the client machine.
 */
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'node_headless_runtime';
  }
  try {
    const components: string[] = [];
    // 1. Hardware concurrency & memory
    components.push(`cores:${navigator.hardwareConcurrency || 0}`);
    components.push(`mem:${(navigator as unknown as { deviceMemory?: number }).deviceMemory || 0}`);
    // 2. Screen & pixel ratio
    if (window.screen) {
      components.push(`scr:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
    }
    // 3. Timezone offset
    components.push(`tz:${new Date().getTimezoneOffset()}`);
    // 4. WebGL unmasked renderer
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && 'getExtension' in gl) {
          const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
          if (ext) {
            const renderer = (gl as WebGLRenderingContext).getParameter(ext.UNMASKED_RENDERER_WEBGL);
            components.push(`gpu:${renderer}`);
          }
        }
      }
    } catch {}

    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  } catch {
    return 'fp_fallback';
  }
}

/**
 * Checks whether this machine has previously been tagged with the permanent security poison pill.
 */
export function isMachineLocallyPoisoned(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage && window.localStorage.getItem(BAN_STORAGE_KEY) === 'true') {
      return true;
    }
    if (window.sessionStorage && window.sessionStorage.getItem(BAN_STORAGE_KEY) === 'true') {
      return true;
    }
    if (typeof document !== 'undefined' && document.cookie.includes(`${BAN_COOKIE_NAME}=1`)) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Completely clears any local poison pill from this browser profile across all storage vaults.
 */
export function clearMachinePoisonPill(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.removeItem(BAN_STORAGE_KEY);
    }
    if (window.sessionStorage) {
      window.sessionStorage.removeItem(BAN_STORAGE_KEY);
    }
    if (typeof document !== 'undefined') {
      document.cookie = `${BAN_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
    }
    if (window.indexedDB) {
      try {
        const req = window.indexedDB.open('jfll_sec_vault', 1);
        req.onsuccess = () => {
          const db = req.result;
          if (db.objectStoreNames.contains('security_tokens')) {
            const tx = db.transaction('security_tokens', 'readwrite');
            tx.objectStore('security_tokens').delete('ban_status');
          }
        };
      } catch {}
    }
  } catch {}
}

/**
 * Permanently locks this browser profile across LocalStorage, SessionStorage, Cookies, and IndexedDB.
 */
export function poisonMachineStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(BAN_STORAGE_KEY, 'true');
    }
    if (window.sessionStorage) {
      window.sessionStorage.setItem(BAN_STORAGE_KEY, 'true');
    }
    if (typeof document !== 'undefined') {
      document.cookie = `${BAN_COOKIE_NAME}=1; path=/; max-age=315360000; SameSite=Strict`;
    }
    if (window.indexedDB) {
      const req = window.indexedDB.open('jfll_sec_vault', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('security_tokens', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('security_tokens', 'readwrite');
        tx.objectStore('security_tokens').put({ id: 'ban_status', blocked: true, at: Date.now() });
      };
    }
  } catch {}
}

/**
 * Asynchronously notifies the backend about detected automation to auto-ban IP & device fingerprint.
 */
export async function reportBotToBackend(reason: string, artifacts: string[] = []): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
  try {
    const fingerprint = getDeviceFingerprint();
    const endpoint = '/api/v1/auth/report-bot';
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': fingerprint,
      },
      body: JSON.stringify({
        fingerprint,
        reason,
        artifacts,
      }),
    }).catch(() => {});
  } catch {}
}

/**
 * Queries the backend security service to verify if a device hardware fingerprint
 * has been unblocked by an administrator. Only an administrator can lift restrictions on the server.
 */
export async function checkDeviceStatusOnline(
  fingerprint: string
): Promise<{ blocked: boolean; reason?: string }> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return { blocked: isMachineLocallyPoisoned() };
  }
  const cleanFp = fingerprint.trim();
  if (!cleanFp) {
    return { blocked: false };
  }
  try {
    const res = await fetch(`/api/v1/auth/device-status?fingerprint=${encodeURIComponent(cleanFp)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Device-Fingerprint': cleanFp,
      },
    });
    if (!res.ok) {
      return { blocked: true };
    }
    const data = await res.json();
    return { blocked: !!data.blocked, reason: data.reason };
  } catch {
    // If server is unreachable, maintain local poison status
    return { blocked: isMachineLocallyPoisoned() };
  }
}

/**
 * Inspects browser environment for tell-tale signatures of headless and automated engines.
 */
export function isAutomatedBrowser(): BotDetectionResult {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isBot: false };
  }

  // Root Administrator Session Bypass:
  // Active sessions belonging to root administrators are never locked out.
  try {
    if (window.sessionStorage) {
      const rawSession = window.sessionStorage.getItem('apollo_leads_session');
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        const email = sess?.email?.toLowerCase();
        if (email === 'deepak@jfll.com' || email === 'tyra.theknath@jfll.com') {
          clearMachinePoisonPill();
          return { isBot: false };
        }
      }
    }
  } catch {}

  const fingerprint = getDeviceFingerprint();

  // 0. Check for existing machine poison pill
  if (isMachineLocallyPoisoned()) {
    return {
      isBot: true,
      reason: 'This machine has been permanently restricted due to prior automated bot activity.',
      fingerprint,
    };
  }

  // 1. Explicit navigator.webdriver flag (W3C standard automated browser flag)
  if (navigator.webdriver === true) {
    poisonMachineStorage();
    reportBotToBackend('navigator.webdriver flag is active');
    return { isBot: true, reason: 'navigator.webdriver flag is active', fingerprint };
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

  const foundArtifacts = automationArtifacts.filter((artifact) => artifact in win);
  if (foundArtifacts.length > 0) {
    poisonMachineStorage();
    reportBotToBackend(`Automation drivers detected: ${foundArtifacts.join(', ')}`, foundArtifacts);
    return {
      isBot: true,
      reason: `Automation driver detected (${foundArtifacts.join(', ')})`,
      fingerprint,
    };
  }

  // 3. User-Agent explicit headless signature
  const ua = navigator.userAgent || '';
  if (/HeadlessChrome|PhantomJS|Electron/i.test(ua)) {
    poisonMachineStorage();
    reportBotToBackend('Headless User-Agent signature');
    return { isBot: true, reason: 'Headless User-Agent signature', fingerprint };
  }

  return { isBot: false, fingerprint };
}

/**
 * Replaces the entire DOM with an enterprise Security Access Denied block screen.
 * Halts React execution and prevents unauthorized headless interaction.
 * Only an administrator can remove the restriction.
 */
export function renderBotBlockScreen(reason?: string, fingerprint?: string): void {
  if (typeof document === 'undefined') return;

  const fp = fingerprint || getDeviceFingerprint();
  document.title = 'Access Restricted · Jet Freight Security';

  const container = document.createElement('div');
  container.id = 'security-guard-block-screen';
  container.setAttribute(
    'style',
    'position:fixed;inset:0;background:#090d16;color:#ffffff;display:flex;align-items:center;justify-content:center;z-index:99999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:24px;box-sizing:border-box;'
  );

  const card = document.createElement('div');
  card.setAttribute(
    'style',
    'max-width:540px;background:#111827;border:1px solid #dc2626;border-radius:16px;padding:36px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);text-align:center;'
  );

  const iconWrapper = document.createElement('div');
  iconWrapper.setAttribute(
    'style',
    'width:64px;height:64px;background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;'
  );
  iconWrapper.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M12 8v4"/>
      <path d="M12 16h.01"/>
    </svg>
  `;
  card.appendChild(iconWrapper);

  const heading = document.createElement('h1');
  heading.setAttribute('style', 'font-size:20px;font-weight:700;color:#f87171;margin:0 0 12px;letter-spacing:-0.02em;');
  heading.textContent = 'Device Access Restricted';
  card.appendChild(heading);

  const desc = document.createElement('p');
  desc.setAttribute('style', 'font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 20px;');
  desc.textContent =
    'This device has been restricted by Jet Freight Security. Only an Administrator can remove restrictions from any user or machine.';
  card.appendChild(desc);

  if (reason) {
    const reasonDiv = document.createElement('div');
    reasonDiv.setAttribute(
      'style',
      'font-size:11px;font-family:monospace;background:#1f2937;color:#fca5a5;padding:8px 12px;border-radius:8px;margin-bottom:16px;word-break:break-all;'
    );
    reasonDiv.textContent = `Detection: ${reason}`;
    card.appendChild(reasonDiv);
  }

  // Device Reference ID block
  const idBox = document.createElement('div');
  idBox.setAttribute(
    'style',
    'background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:8px;'
  );
  const idLeft = document.createElement('div');
  idLeft.setAttribute('style', 'text-align:left;overflow:hidden;');
  const idLabel = document.createElement('div');
  idLabel.setAttribute('style', 'font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;');
  idLabel.textContent = 'Device Reference ID';
  const idValue = document.createElement('div');
  idValue.setAttribute('style', 'font-size:12px;font-family:monospace;color:#38bdf8;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
  idValue.textContent = fp;
  idLeft.appendChild(idLabel);
  idLeft.appendChild(idValue);
  idBox.appendChild(idLeft);

  const copyBtn = document.createElement('button');
  copyBtn.setAttribute(
    'style',
    'background:#0f172a;border:1px solid #475569;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;shrink:0;transition:all 0.2s;'
  );
  copyBtn.textContent = 'Copy ID';
  copyBtn.onclick = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fp).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy ID';
        }, 2000);
      });
    }
  };
  idBox.appendChild(copyBtn);
  card.appendChild(idBox);

  // Status feedback container
  const statusBanner = document.createElement('div');
  statusBanner.id = 'security-status-banner';
  statusBanner.setAttribute(
    'style',
    'display:none;font-size:12px;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-weight:500;'
  );
  card.appendChild(statusBanner);

  const footer = document.createElement('div');
  footer.setAttribute(
    'style',
    'border-top:1px solid #374151;padding-top:20px;font-size:12px;color:#94a3b8;line-height:1.5;display:flex;flex-direction:column;gap:14px;align-items:center;'
  );

  const adminHelp = document.createElement('div');
  adminHelp.textContent =
    'To request unblocking, please share your Device Reference ID with an administrator (deepak@jfll.com). Only an administrator can unblock your device.';
  footer.appendChild(adminHelp);

  const verifyBtn = document.createElement('button');
  verifyBtn.setAttribute(
    'style',
    'background:#1e293b;border:1px solid #38bdf8;color:#38bdf8;padding:8px 20px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;'
  );
  verifyBtn.textContent = 'Verify Restriction Status';
  verifyBtn.onmouseover = () => {
    verifyBtn.style.background = '#0369a1';
    verifyBtn.style.color = '#ffffff';
  };
  verifyBtn.onmouseout = () => {
    verifyBtn.style.background = '#1e293b';
    verifyBtn.style.color = '#38bdf8';
  };

  verifyBtn.onclick = async () => {
    verifyBtn.textContent = 'Checking administrator records...';
    verifyBtn.style.opacity = '0.7';
    verifyBtn.style.cursor = 'wait';

    try {
      const status = await checkDeviceStatusOnline(fp);
      if (!status.blocked) {
        // Admin lifted the restriction!
        clearMachinePoisonPill();
        statusBanner.style.display = 'block';
        statusBanner.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBanner.style.border = '1px solid #10b981';
        statusBanner.style.color = '#6ee7b7';
        statusBanner.textContent = 'Restriction removed by administrator! Restoring access...';
        verifyBtn.textContent = 'Access Restored';
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        statusBanner.style.display = 'block';
        statusBanner.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBanner.style.border = '1px solid #ef4444';
        statusBanner.style.color = '#fca5a5';
        statusBanner.textContent =
          'Device restriction is still active. Please contact an administrator to approve your device.';
        verifyBtn.textContent = 'Verify Restriction Status';
        verifyBtn.style.opacity = '1';
        verifyBtn.style.cursor = 'pointer';
      }
    } catch {
      statusBanner.style.display = 'block';
      statusBanner.style.background = 'rgba(234, 179, 8, 0.15)';
      statusBanner.style.border = '1px solid #eab308';
      statusBanner.style.color = '#fef08a';
      statusBanner.textContent = 'Unable to reach security server. Please ensure network connectivity.';
      verifyBtn.textContent = 'Verify Restriction Status';
      verifyBtn.style.opacity = '1';
      verifyBtn.style.cursor = 'pointer';
    }
  };
  footer.appendChild(verifyBtn);

  card.appendChild(footer);
  container.appendChild(card);

  document.body.innerHTML = '';
  document.body.appendChild(container);
}
