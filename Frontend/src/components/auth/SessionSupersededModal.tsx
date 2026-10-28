import React from 'react';
import { ShieldAlert, LogIn } from 'lucide-react';

export interface SessionSupersededModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
}

export const SessionSupersededModal: React.FC<SessionSupersededModalProps> = ({
  isOpen,
  onAcknowledge,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-superseded-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-rose-200">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
          <ShieldAlert className="w-6 h-6 text-rose-600" />
        </div>

        <div className="text-center">
          <h3
            id="session-superseded-title"
            className="text-lg font-bold text-slate-900 tracking-tight"
          >
            Signed in on Another Device
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Your Jet Freight work account was signed in from another computer or browser window.
            To safeguard enterprise customs leads and customer data, only one concurrent session is permitted.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAcknowledge}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In on This Device</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400 font-mono">
            Security Policy: Single-Device Active Session Enforcement
          </span>
        </div>
      </div>
    </div>
  );
};
