import React, { useState, useEffect } from 'react';

export interface SafeAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imgClassName?: string;
  rounded?: string;
  priority?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

// Generates 1-2 uppercase initials from a name string
function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'TM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic vibrant gradient generator based on user name
const GRADIENTS = [
  'from-orange-500 to-amber-500',
  'from-rose-500 to-orange-500',
  'from-purple-600 to-indigo-600',
  'from-blue-600 to-cyan-500',
  'from-emerald-600 to-teal-500',
  'from-amber-600 to-yellow-500',
];

function getGradient(name?: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  alt = 'Avatar',
  name = 'User',
  size = 'md',
  className = '',
  imgClassName = '',
  rounded = 'rounded-full',
  priority = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);

    if (!src) {
      setHasError(true);
      return;
    }

    // Mobile network timeout fallback: if image hasn't loaded in 4.5 seconds, fall back gracefully
    const timer = setTimeout(() => {
      setIsLoaded((loaded) => {
        if (!loaded) {
          setHasError(true);
        }
        return loaded;
      });
    }, 4500);

    return () => clearTimeout(timer);
  }, [src]);

  const initials = getInitials(name);
  const gradient = getGradient(name);
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  // Solid circular placeholder gradient badge with initials
  if (!src || hasError) {
    return (
      <div
        className={`shrink-0 flex items-center justify-center font-black text-white bg-gradient-to-tr ${gradient} shadow-2xs border border-white/20 select-none ${sizeClasses} ${rounded} ${className}`}
        title={name}
        aria-label={alt || name}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs select-none ${sizeClasses} ${rounded} ${className}`}
    >
      {/* Background placeholder while image is resolving */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 flex items-center justify-center font-black text-white bg-gradient-to-tr ${gradient} animate-pulse`}
        >
          <span className="opacity-75">{initials}</span>
        </div>
      )}

      {/* Responsive lazy-loaded image with error trapping */}
      <img
        src={src}
        alt={alt || name}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${rounded} ${imgClassName}`}
      />
    </div>
  );
};
