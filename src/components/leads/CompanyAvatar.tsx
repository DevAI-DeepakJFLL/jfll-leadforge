import React from 'react';

export interface CompanyAvatarProps {
  company: string;
  logoBgColor?: string;
  logoTextColor?: string;
  logoInitials?: string;
  companyLogo?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  company,
  logoBgColor,
  logoTextColor,
  logoInitials,
  companyLogo,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  const normalized = company.trim().toLowerCase();

  // 1. SunMedia: Exact orange 8-pointed asterisk / starburst matching Ref.jpg
  if (normalized.includes('sunmedia') || normalized === 'sm') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center shrink-0 bg-transparent select-none ${className}`}
        title="SunMedia"
        aria-label="SunMedia logo"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF7A00"
          strokeWidth="3.2"
          strokeLinecap="round"
          className="w-6 h-6"
        >
          <line x1="12" y1="2.5" x2="12" y2="21.5" />
          <line x1="2.5" y1="12" x2="21.5" y2="12" />
          <line x1="5.28" y1="5.28" x2="18.72" y2="18.72" />
          <line x1="18.72" y1="5.28" x2="5.28" y2="18.72" />
        </svg>
      </div>
    );
  }

  // 2. 896 Medi: Exact cyan circle with "896 MEDIA" in white matching Ref.jpg
  if (normalized.includes('896 medi') || normalized.includes('896')) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#00C2CB] flex flex-col items-center justify-center text-white shrink-0 select-none shadow-2xs ${className}`}
        title="896 Medi"
        aria-label="896 Medi logo"
      >
        <span className="text-[9px] font-black leading-none tracking-tighter">896</span>
        <span className="text-[5.5px] font-bold leading-none tracking-tighter opacity-90 mt-[1px]">MEDIA</span>
      </div>
    );
  }

  // 3. The Scratch Collective: Exact blue circle with "$c" / "Sc" monogram matching Ref.jpg
  if (normalized.includes('scratch collective') || normalized.includes('scratch')) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#1D4ED8] flex items-center justify-center text-white shrink-0 select-none shadow-2xs ${className}`}
        title="The Scratch Collective"
        aria-label="The Scratch Collective logo"
      >
        <span className="text-[11px] font-bold tracking-tighter italic font-serif">
          $c
        </span>
      </div>
    );
  }

  // 4. Mood Media: Exact black circle with "MOOD:MEDIA" text matching Ref.jpg
  if (normalized.includes('mood media') || normalized.includes('mood')) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-[#18181B] flex items-center justify-center text-white shrink-0 select-none shadow-2xs px-0.5 ${className}`}
        title="Mood Media"
        aria-label="Mood Media logo"
      >
        <span className="text-[6.5px] font-extrabold tracking-tight text-center leading-[8px]">
          MOOD:MEDIA
        </span>
      </div>
    );
  }

  // 5. Image logo if available and valid
  if (companyLogo && companyLogo.startsWith('http')) {
    return (
      <img
        src={companyLogo}
        alt={`${company} logo`}
        className={`${sizeClasses} rounded-full object-cover shrink-0 border border-slate-200 ${className}`}
      />
    );
  }

  // 6. Configured or computed initials
  const initials =
    logoInitials ||
    company
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    company.slice(0, 2).toUpperCase();

  const bgColor = logoBgColor || '#0066F5';
  const textColor = logoTextColor || '#FFFFFF';

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 select-none shadow-2xs ${className}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      title={company}
      aria-label={`${company} logo`}
    >
      <span>{initials}</span>
    </div>
  );
};

export default CompanyAvatar;
