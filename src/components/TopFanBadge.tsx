import React from 'react';
import { Star } from 'lucide-react';

interface TopFanBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const TopFanBadge: React.FC<TopFanBadgeProps> = ({
  size = 'sm',
  className = '',
  title = 'Official Top Fan Supporter',
}) => {
  const sizeMap = {
    xs: { icon: 'w-2.5 h-2.5', ring: 'w-4 h-4 p-0.5' },
    sm: { icon: 'w-3 h-3', ring: 'w-5 h-5 p-0.5' },
    md: { icon: 'w-3.5 h-3.5', ring: 'w-6 h-6 p-1' },
    lg: { icon: 'w-4.5 h-4.5', ring: 'w-7 h-7 p-1' },
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      title={title}
      aria-label="Top Fan Star"
    >
      <span className={`inline-flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.55)] border border-amber-300 hover:scale-110 transition-transform ${sizeMap.ring}`}>
        <Star className={`${sizeMap.icon} fill-amber-950 text-amber-950 stroke-[2]`} />
      </span>
    </span>
  );
};
