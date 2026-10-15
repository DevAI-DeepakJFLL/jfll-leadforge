import React from 'react';
import { X, Database } from 'lucide-react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

import { useModalDismiss } from '@/hooks/useModalDismiss';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  pageSize,
  onPageSizeChange,
}) => {
  useModalDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/assets/jfll-logo.jpeg"
                alt="JFLL Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-semibold text-slate-900">Jet Freight Prospecting Preferences</h2>
              <p className="text-xs text-slate-500">Configure your internal leads explorer environment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-apollo-400 shrink-0"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-xs">
          {/* Default Page Size */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-900 block text-xs">
              Default Records per Page
            </label>
            <p className="text-slate-500 text-[11px]">
              Set how many prospect rows are retrieved and rendered at a time.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[25, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => onPageSizeChange(size)}
                  className={`px-3.5 py-2 min-h-[40px] rounded-lg border font-medium transition-colors ${
                    pageSize === size
                      ? 'border-apollo bg-apollo-50 text-apollo font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {size} rows
                </button>
              ))}
            </div>
          </div>

          {/* Export Settings */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <label className="font-semibold text-slate-900 block text-xs">
              CSV Export Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled
                  className="rounded text-apollo focus:ring-apollo w-3.5 h-3.5"
                />
                <span>Include verified contact information (Direct Email, Phones)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  defaultChecked
                  disabled
                  className="rounded text-apollo focus:ring-apollo w-3.5 h-3.5"
                />
                <span>Include company metadata (Headcount, Industry, Location)</span>
              </label>
            </div>
          </div>

          {/* API & Mock Engine Status */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-apollo" />
                <span>Synthetic Mock Data Engine</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Running 350+ deterministic leads with client-side MSW interception. No real personal records are stored.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 min-h-[40px] bg-apollo text-white font-semibold rounded-lg text-xs hover:bg-apollo-600 transition-colors shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
