import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  text: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (text: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (text: string, type: ToastType = 'success', duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, text, type, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  className?: string;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  className = '',
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed top-16 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full ${className}`}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

interface ToastMessageProps {
  toast: ToastItem;
  onDismiss: () => void;
}

const ToastMessage: React.FC<ToastMessageProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 3200);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-slate-900 border-slate-700/80 text-white',
    error: 'bg-red-950 border-red-800 text-red-100',
    warning: 'bg-amber-950 border-amber-800 text-amber-100',
    info: 'bg-slate-900 border-slate-700/80 text-white',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150 transition-all ${
        bgStyles[toast.type]
      }`}
      role="status"
    >
      <div className="flex items-center gap-2 min-w-0">
        {icons[toast.type]}
        <span className="truncate">{toast.text}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-0.5 rounded transition-colors focus:outline-none"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default ToastProvider;
