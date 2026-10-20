import React from 'react';
import { Sparkles, Award } from 'lucide-react';

interface TopFanBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const TopFanBadge: React.FC<TopFanBadgeProps> = ({
  size = 'sm',
  showText = true,
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-300/60 transition-all hover:scale-105 select-none ${sizeClasses} ${className}`}
      title="Official Top Fan · Verified Topson Media Supporter"
    >
      <span className="relative flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-70" />
        <span className="text-amber-100 drop-shadow-[0_0_4px_rgba(0,0,0,0.4)]">⭐</span>
      </span>
      {showText && (
        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] tracking-wide font-black">
          TOP FAN
        </span>
      )}
    </span>
  );
};
