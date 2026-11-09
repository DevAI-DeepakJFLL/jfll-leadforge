import React, { useState } from 'react';
import { PhoneOff, PhoneCall, Mail, CalendarCheck2, Loader2 } from 'lucide-react';
import { logApproach } from '@/services/approachLogService';
import { getStoredSession } from '@/services/authService';
import { showToast } from '@/components/ui';
import { UserSession } from '@/types/auth';

export interface QuickTouchpointLoggerProps {
  entityType: 'datamyne' | 'jfll' | 'jfll_customer';
  entityId: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  currentUser?: UserSession | null;
  onLogged?: (touchpoint: string) => void;
  className?: string;
}

export interface TouchpointActionConfig {
  key: string;
  action: 'call' | 'email' | 'meeting';
  status: 'unreachable' | 'connected' | 'sent' | 'scheduled';
  label: string;
  ariaLabel: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  toastMessage: string;
  toastType: 'info' | 'success';
}

export const TOUCHPOINT_ACTIONS: TouchpointActionConfig[] = [
  {
    key: 'unreachable',
    action: 'call',
    status: 'unreachable',
    label: 'No Answer',
    ariaLabel: 'No Answer / Voicemail',
    tooltip: 'Log Call (No Answer / Voicemail)',
    icon: PhoneOff,
    toastMessage: 'Logged call: No Answer / Unreachable',
    toastType: 'info',
  },
  {
    key: 'connected',
    action: 'call',
    status: 'connected',
    label: 'Connected',
    ariaLabel: 'Connected',
    tooltip: 'Log Call (Connected / Follow-up)',
    icon: PhoneCall,
    toastMessage: 'Logged call: Connected',
    toastType: 'success',
  },
  {
    key: 'sent',
    action: 'email',
    status: 'sent',
    label: 'Email Sent',
    ariaLabel: 'Email Sent',
    tooltip: 'Log Email Sent',
    icon: Mail,
    toastMessage: 'Logged intro email sent',
    toastType: 'success',
  },
  {
    key: 'scheduled',
    action: 'meeting',
    status: 'scheduled',
    label: 'Meeting Booked',
    ariaLabel: 'Meeting Booked',
    tooltip: 'Log Meeting Booked',
    icon: CalendarCheck2,
    toastMessage: 'Logged discovery meeting booked',
    toastType: 'success',
  },
];

export const QuickTouchpointLogger: React.FC<QuickTouchpointLoggerProps> = ({
  entityType,
  entityId,
  companyName,
  contactPerson,
  phone,
  email,
  currentUser,
  onLogged,
  className = '',
}) => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleAction = async (actionConfig: TouchpointActionConfig) => {
    if (loadingKey) return;
    setLoadingKey(actionConfig.key);

    const session = currentUser || getStoredSession();
    const salespersonName = session?.name || 'Sales Coordinator';
    const salespersonEmail = session?.email || 'sales.coordinator@jfll.com';

    try {
      await logApproach({
        entityType: entityType === 'jfll' ? 'jfll_customer' : entityType,
        entityId,
        companyName,
        contactPerson,
        phone,
        email,
        action: actionConfig.action,
        channel: actionConfig.action,
        type: actionConfig.action,
        status: actionConfig.status,
        salespersonName,
        salespersonEmail,
        note: actionConfig.label,
      });

      showToast(`${actionConfig.toastMessage} for ${companyName}`, actionConfig.toastType);
      onLogged?.(actionConfig.key);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log approach touchpoint';
      showToast(msg, 'error');
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div
      role="group"
      aria-label="Quick touchpoint actions"
      className={`inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs ${className}`}
    >
      {TOUCHPOINT_ACTIONS.map((item) => {
        const IconComponent = item.icon;
        const isLoading = loadingKey === item.key;
        const isDisabled = Boolean(loadingKey && !isLoading);

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleAction(item)}
            disabled={isDisabled || isLoading}
            aria-label={item.ariaLabel}
            title={item.tooltip}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-apollo disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500 shrink-0" />
            ) : (
              <IconComponent className="w-4 h-4 shrink-0 text-slate-500" />
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default QuickTouchpointLogger;
