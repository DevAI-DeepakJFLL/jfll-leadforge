import React from 'react';
import { UserCheck } from 'lucide-react';

export interface AssignedBadgeProps {
  assignedTo: string;
  branch?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Standard visual badge indicating that a lead record is actively assigned to a sales representative.
 */
export const AssignedBadge: React.FC<AssignedBadgeProps> = ({
  assignedTo,
  branch,
  className = '',
  showIcon = true,
}) => {
  const title = branch
    ? `Assigned to ${assignedTo} (${branch}) in Lead Tracker`
    : `Assigned to ${assignedTo} in Lead Tracker`;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 shrink-0 shadow-2xs ${className}`}
      title={title}
    >
      {showIcon && <UserCheck className="w-2.5 h-2.5 text-blue-600 shrink-0" />}
      <span>Assigned: {assignedTo}</span>
    </span>
  );
};
