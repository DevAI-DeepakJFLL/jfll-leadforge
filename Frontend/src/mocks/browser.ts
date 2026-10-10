import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { setupFetchFallback } from './fetchFallback';

export const worker = setupWorker(...handlers);

/**
 * Initializes mocking for client-side execution.
 * Tries MSW service worker first with a timeout, and seamlessly falls back
 * to in-memory fetch interception if service workers are disabled, unavailable, or timing out.
 */
export async function initMocks(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if ServiceWorker API is available in this browser/environment
  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
    console.info('[Mocks] Service workers not supported or file protocol; using fetch fallback.');
    setupFetchFallback();
    return;
  }

  try {
    // Attempt worker start with a 1500ms safety timeout
    await Promise.race([
      worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MSW start registration timed out')), 1500)
      ),
    ]);
    console.info('[Mocks] MSW Service Worker active and intercepting.');
  } catch (err) {
    console.warn('[Mocks] Service worker start failed or timed out. Falling back to fetch mock:', err);
    setupFetchFallback();
  }
}
