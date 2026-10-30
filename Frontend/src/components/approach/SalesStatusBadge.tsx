import React from 'react';
import {
  CheckCircle2,
  Clock,
  FileCheck,
  Headphones,
  MinusCircle,
  PhoneCall,
  UserX,
  XCircle,
} from 'lucide-react';
import { SalesStatus } from '@/types/approachLog';

interface SalesStatusBadgeProps {
  status: SalesStatus | string | null | undefined;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const SalesStatusBadge: React.FC<SalesStatusBadgeProps> = ({
  status = 'Not Contacted',
  className = '',
  showIcon = true,
  size = 'md',
}) => {
  const normalizedStatus = (status as SalesStatus) || 'Not Contacted';

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (normalizedStatus) {
    case 'Not Contacted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Not Contacted"
        >
          {showIcon && <MinusCircle className={`${iconSizeClass} text-slate-400 shrink-0`} />}
          <span>Not Contacted</span>
        </span>
      );

    case 'Contacted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Contacted"
        >
          {showIcon && <PhoneCall className={`${iconSizeClass} text-blue-500 shrink-0`} />}
          <span>Contacted</span>
        </span>
      );

    case 'Report Sent':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Report Sent"
        >
          {showIcon && <FileCheck className={`${iconSizeClass} text-cyan-600 shrink-0`} />}
          <span>Report Sent</span>
        </span>
      );

    case 'Working on It':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Working on It"
        >
          {showIcon && <Headphones className={`${iconSizeClass} text-purple-500 shrink-0`} />}
          <span>Working on It</span>
        </span>
      );

    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: In Progress"
        >
          {showIcon && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
          <span>In Progress</span>
        </span>
      );

    case 'On Hold':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-orange-50 text-orange-800 border border-orange-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: On Hold"
        >
          {showIcon && <Clock className={`${iconSizeClass} text-orange-500 shrink-0`} />}
          <span>On Hold</span>
        </span>
      );

    case 'No Response':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: No Response"
        >
          {showIcon && <UserX className={`${iconSizeClass} text-slate-400 shrink-0`} />}
          <span>No Response</span>
        </span>
      );

    case 'Not Interested':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Not Interested"
        >
          {showIcon && <XCircle className={`${iconSizeClass} text-rose-500 shrink-0`} />}
          <span>Not Interested</span>
        </span>
      );

    case 'Converted to Active':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap ${sizeClasses} ${className}`}
          title="Status: Converted to Active"
        >
          {showIcon && <CheckCircle2 className={`${iconSizeClass} text-emerald-600 shrink-0`} />}
          <span>Converted to Active</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 ${className}`}>
          {normalizedStatus}
        </span>
      );
  }
};
