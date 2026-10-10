import React from 'react';

export interface JfllCustomerGroupBadgeProps {
  group: string;
  className?: string;
}

/**
 * Design 1: Modern Micro-Dot Pill (Stripe / Linear design pattern)
 * Muted, neutral container with a semantic color-coded micro indicator dot.
 */
export const JfllCustomerGroupBadge: React.FC<JfllCustomerGroupBadgeProps> = ({
  group,
  className = '',
}) => {
  let dotColor = 'bg-slate-400';

  switch (group.toLowerCase()) {
    case 'shipper / consignee':
    case 'shipper':
      dotColor = 'bg-blue-500';
      break;
    case 'subagent':
      dotColor = 'bg-purple-500';
      break;
    case 'overseas agent':
      dotColor = 'bg-amber-500';
      break;
    case 'gsa':
      dotColor = 'bg-indigo-500';
      break;
    case 'nvocc / coloader':
    case 'nvocc':
      dotColor = 'bg-cyan-500';
      break;
    case 'airline':
      dotColor = 'bg-emerald-500';
      break;
    case 'other agent':
      dotColor = 'bg-teal-500';
      break;
    case 'transporter':
      dotColor = 'bg-orange-500';
      break;
    case 'shipping line':
      dotColor = 'bg-sky-600';
      break;
    case 'general expense':
      dotColor = 'bg-slate-500';
      break;
    case 'custom broker':
      dotColor = 'bg-rose-500';
      break;
    default:
      dotColor = 'bg-slate-400';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200/90 text-slate-700 whitespace-nowrap shadow-2xs ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{group}</span>
    </span>
  );
};
