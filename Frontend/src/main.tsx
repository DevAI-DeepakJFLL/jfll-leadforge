import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';
import '@/styles/globals.css';
import { initMocks } from '@/mocks/browser';
import { initGlobalErrorLogging } from '@/utils/logger';
import {
  isAutomatedBrowser,
  renderBotBlockScreen,
  checkDeviceStatusOnline,
  clearMachinePoisonPill,
} from '@/utils/antiBotGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes fresh
      gcTime: 1000 * 60 * 4, // 4 minutes garbage collection (automatically unloads inactive entity datasets from browser RAM)
    },
  },
});

async function renderApp() {
  initGlobalErrorLogging();

  // Enforce Anti-Bot and Anti-Headless Guard before mounting React
  const botCheck = isAutomatedBrowser();
  if (botCheck.isBot) {
    // If flagged by prior local storage lock, verify whether an administrator has lifted the restriction
    if (botCheck.fingerprint) {
      try {
        const liveStatus = await checkDeviceStatusOnline(botCheck.fingerprint);
        if (!liveStatus.blocked) {
          // Restriction cleared by administrator on the server
          clearMachinePoisonPill();
        } else {
          renderBotBlockScreen(liveStatus.reason || botCheck.reason, botCheck.fingerprint);
          return;
        }
      } catch {
        renderBotBlockScreen(botCheck.reason, botCheck.fingerprint);
        return;
      }
    } else {
      renderBotBlockScreen(botCheck.reason);
      return;
    }
  }

  await initMocks();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

renderApp();
