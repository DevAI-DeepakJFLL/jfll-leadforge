import React from 'react';

export interface JfllCustomerGroupBadgeProps {
  group: string;
  className?: string;
}

export const JfllCustomerGroupBadge: React.FC<JfllCustomerGroupBadgeProps> = ({
  group,
  className = '',
}) => {
  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  switch (group.toLowerCase()) {
    case 'shipper / consignee':
    case 'shipper':
      badgeStyles = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'subagent':
      badgeStyles = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'overseas agent':
      badgeStyles = 'bg-amber-50 text-amber-800 border-amber-200';
      break;
    case 'gsa':
      badgeStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      break;
    case 'nvocc / coloader':
    case 'nvocc':
      badgeStyles = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      break;
    case 'airline':
      badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      break;
    case 'custom broker':
      badgeStyles = 'bg-rose-50 text-rose-700 border-rose-200';
      break;
    default:
      badgeStyles = 'bg-slate-50 text-slate-700 border-slate-200';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border leading-tight ${badgeStyles} ${className}`}
    >
      {group}
    </span>
  );
};
