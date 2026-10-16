import React from 'react';

export interface DatamyneCategoryBadgeProps {
  category: string;
  className?: string;
}

/**
 * Modern Micro-Dot Pill Badge for Logistics Categories (Linear / Stripe pattern)
 */
export const DatamyneCategoryBadge: React.FC<DatamyneCategoryBadgeProps> = ({
  category,
  className = '',
}) => {
  let dotColor = 'bg-slate-400';
  let badgeBg = 'bg-slate-50';
  let badgeBorder = 'border-slate-200';
  let textColor = 'text-slate-700';

  const catLower = category.toLowerCase();
  if (catLower.includes('perishable')) {
    dotColor = 'bg-emerald-500';
    badgeBg = 'bg-emerald-50/70';
    badgeBorder = 'border-emerald-200';
    textColor = 'text-emerald-800';
  } else if (catLower.includes('pharma')) {
    dotColor = 'bg-purple-500';
    badgeBg = 'bg-purple-50/70';
    badgeBorder = 'border-purple-200';
    textColor = 'text-purple-800';
  } else if (catLower.includes('textile') || catLower.includes('apparel')) {
    dotColor = 'bg-sky-500';
    badgeBg = 'bg-sky-50/70';
    badgeBorder = 'border-sky-200';
    textColor = 'text-sky-800';
  } else if (catLower.includes('engineering') || catLower.includes('machinery')) {
    dotColor = 'bg-amber-500';
    badgeBg = 'bg-amber-50/70';
    badgeBorder = 'border-amber-200';
    textColor = 'text-amber-800';
  } else if (catLower.includes('chemical')) {
    dotColor = 'bg-rose-500';
    badgeBg = 'bg-rose-50/70';
    badgeBorder = 'border-rose-200';
    textColor = 'text-rose-800';
  } else if (catLower.includes('electronic')) {
    dotColor = 'bg-indigo-500';
    badgeBg = 'bg-indigo-50/70';
    badgeBorder = 'border-indigo-200';
    textColor = 'text-indigo-800';
  } else if (catLower.includes('automotive') || catLower.includes('ev')) {
    dotColor = 'bg-violet-500';
    badgeBg = 'bg-violet-50/70';
    badgeBorder = 'border-violet-200';
    textColor = 'text-violet-800';
  } else {
    dotColor = 'bg-slate-500';
    badgeBg = 'bg-slate-50';
    badgeBorder = 'border-slate-200';
    textColor = 'text-slate-700';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap shadow-2xs ${badgeBg} ${badgeBorder} ${textColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{category}</span>
    </span>
  );
};
