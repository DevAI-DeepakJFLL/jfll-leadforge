import React from 'react';
import {
  Plane,
  Car,
  Pill,
  Leaf,
  Cpu,
  Cog,
  Building2,
  FlaskConical,
  Zap,
  Shirt,
  Package,
  Ship,
} from 'lucide-react';

export interface ApolloVerticalBadgeProps {
  industry: string;
  className?: string;
  showMode?: boolean;
}

export interface VerticalTheme {
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
  modeLabel: string;
  modeIcon: React.ComponentType<{ className?: string }>;
  modeColor: string;
}

export function getApolloVerticalTheme(industry: string): VerticalTheme {
  const ind = industry.toLowerCase();

  if (ind.includes('aviation') || ind.includes('aerospace')) {
    return {
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200/80',
      textColor: 'text-sky-800',
      dotColor: 'bg-sky-500',
      icon: Plane,
      modeLabel: 'Air Freight AOG',
      modeIcon: Plane,
      modeColor: 'text-sky-600',
    };
  }

  if (ind.includes('automotive') || ind.includes('motor')) {
    return {
      badgeBg: 'bg-violet-50',
      badgeBorder: 'border-violet-200/80',
      textColor: 'text-violet-800',
      dotColor: 'bg-violet-500',
      icon: Car,
      modeLabel: 'Air AOG / Ocean FCL',
      modeIcon: Ship,
      modeColor: 'text-violet-600',
    };
  }

  if (ind.includes('pharma') || ind.includes('biotech') || ind.includes('medical') || ind.includes('health')) {
    return {
      badgeBg: 'bg-purple-50',
      badgeBorder: 'border-purple-200/80',
      textColor: 'text-purple-800',
      dotColor: 'bg-purple-500',
      icon: Pill,
      modeLabel: 'Cold-Chain Air',
      modeIcon: Plane,
      modeColor: 'text-purple-600',
    };
  }

  if (ind.includes('food') || ind.includes('beverage') || ind.includes('consumer') || ind.includes('supermarket')) {
    return {
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200/80',
      textColor: 'text-emerald-800',
      dotColor: 'bg-emerald-500',
      icon: Leaf,
      modeLabel: 'Reefer Ocean / Air',
      modeIcon: Ship,
      modeColor: 'text-emerald-600',
    };
  }

  if (ind.includes('electronic') || ind.includes('telecom') || ind.includes('semiconductor') || ind.includes('hardware')) {
    return {
      badgeBg: 'bg-indigo-50',
      badgeBorder: 'border-indigo-200/80',
      textColor: 'text-indigo-800',
      dotColor: 'bg-indigo-500',
      icon: Cpu,
      modeLabel: 'Air Cargo & FCL',
      modeIcon: Plane,
      modeColor: 'text-indigo-600',
    };
  }

  if (ind.includes('machinery') || ind.includes('mechanical') || ind.includes('industrial') || ind.includes('automation')) {
    return {
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200/80',
      textColor: 'text-amber-800',
      dotColor: 'bg-amber-500',
      icon: Cog,
      modeLabel: 'Ocean Project Cargo',
      modeIcon: Ship,
      modeColor: 'text-amber-600',
    };
  }

  if (ind.includes('construction') || ind.includes('building') || ind.includes('mining')) {
    return {
      badgeBg: 'bg-orange-50',
      badgeBorder: 'border-orange-200/80',
      textColor: 'text-orange-800',
      dotColor: 'bg-orange-500',
      icon: Building2,
      modeLabel: 'Ocean Breakbulk',
      modeIcon: Ship,
      modeColor: 'text-orange-600',
    };
  }

  if (ind.includes('chemical') || ind.includes('plastic') || ind.includes('polymer')) {
    return {
      badgeBg: 'bg-rose-50',
      badgeBorder: 'border-rose-200/80',
      textColor: 'text-rose-800',
      dotColor: 'bg-rose-500',
      icon: FlaskConical,
      modeLabel: 'Hazmat / DG Cargo',
      modeIcon: Ship,
      modeColor: 'text-rose-600',
    };
  }

  if (ind.includes('energy') || ind.includes('oil') || ind.includes('solar') || ind.includes('clean tech')) {
    return {
      badgeBg: 'bg-teal-50',
      badgeBorder: 'border-teal-200/80',
      textColor: 'text-teal-800',
      dotColor: 'bg-teal-500',
      icon: Zap,
      modeLabel: 'Heavy Lift / Ocean',
      modeIcon: Ship,
      modeColor: 'text-teal-600',
    };
  }

  if (ind.includes('retail') || ind.includes('apparel') || ind.includes('textile')) {
    return {
      badgeBg: 'bg-blue-50',
      badgeBorder: 'border-blue-200/80',
      textColor: 'text-blue-800',
      dotColor: 'bg-blue-500',
      icon: Shirt,
      modeLabel: 'Ocean FCL / LCL',
      modeIcon: Ship,
      modeColor: 'text-blue-600',
    };
  }

  return {
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200/80',
    textColor: 'text-slate-800',
    dotColor: 'bg-slate-400',
    icon: Package,
    modeLabel: 'Commercial Cargo',
    modeIcon: Ship,
    modeColor: 'text-slate-500',
  };
}

export const ApolloVerticalBadge: React.FC<ApolloVerticalBadgeProps> = ({
  industry,
  className = '',
  showMode = true,
}) => {
  const theme = getApolloVerticalTheme(industry);
  const Icon = theme.icon;
  const ModeIcon = theme.modeIcon;

  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      {/* Category Micro-Dot Pill Badge */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shadow-2xs ${theme.badgeBg} ${theme.badgeBorder} ${theme.textColor} capitalize w-fit`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dotColor}`} />
        <Icon className="w-3 h-3 shrink-0 opacity-80" />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{industry}</span>
      </span>

      {/* Logistics Freight Mode Pill */}
      {showMode && (
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium pl-1">
          <ModeIcon className={`w-2.5 h-2.5 shrink-0 ${theme.modeColor}`} />
          <span className="truncate">{theme.modeLabel}</span>
        </span>
      )}
    </div>
  );
};

export default ApolloVerticalBadge;
