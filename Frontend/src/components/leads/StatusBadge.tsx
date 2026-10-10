import React from 'react';
import { LeadStatus } from '@/types/lead';

export interface StatusBadgeProps {
  status: LeadStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase().trim();

  if (normalized === 'NET NEW') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-purple-300 text-purple-700 bg-purple-50/30 select-none ${className}`}
      >
        NET NEW
      </span>
    );
  }

  if (normalized === 'COLD') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-slate-300 text-slate-600 bg-slate-50/30 select-none ${className}`}
      >
        COLD
      </span>
    );
  }

  if (normalized === 'IN SEQUENCE') {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-blue-300 text-blue-600 bg-blue-50/30 select-none ${className}`}
      >
        IN SEQUENCE
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-slate-200 text-slate-600 bg-white select-none ${className}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
