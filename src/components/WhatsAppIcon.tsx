import React from 'react';

interface WhatsAppIconProps {
  className?: string;
  size?: number;
}

/**
 * Official WhatsApp Brand Icon with accurate speech-bubble and telephone receiver vector
 */
export const WhatsAppIcon: React.FC<WhatsAppIconProps> = ({
  className = 'w-5 h-5 fill-white',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.15C10.57 20.15 9.12 19.75 7.85 19L7.55 18.82L4.43 19.64L5.26 16.6L5.06 16.29C4.24 14.98 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.05 20.15ZM16.57 14.39C16.32 14.27 15.1 13.67 14.87 13.58C14.64 13.5 14.48 13.45 14.31 13.7C14.15 13.95 13.68 14.5 13.53 14.67C13.39 14.83 13.25 14.85 13 14.73C12.75 14.6 11.95 14.34 11 13.5C10.26 12.84 9.76 12.03 9.61 11.78C9.47 11.53 9.6 11.4 9.72 11.27C9.83 11.16 9.97 10.98 10.1 10.83C10.22 10.68 10.26 10.57 10.35 10.4C10.43 10.23 10.39 10.09 10.33 9.96C10.26 9.84 9.77 8.64 9.57 8.14C9.37 7.66 9.17 7.73 9.02 7.72C8.88 7.71 8.71 7.71 8.55 7.71C8.38 7.71 8.12 7.77 7.89 8.02C7.67 8.27 7.03 8.87 7.03 10.09C7.03 11.31 7.92 12.49 8.04 12.65C8.17 12.82 9.79 15.31 12.26 16.38C12.85 16.63 13.31 16.78 13.66 16.9C14.25 17.08 14.79 17.06 15.22 16.99C15.7 16.92 16.69 16.39 16.9 15.81C17.1 15.23 17.1 14.73 17.04 14.63C16.98 14.52 16.82 14.51 16.57 14.39Z" />
    </svg>
  );
};

/**
 * Reusable full-color WhatsApp button / badge container
 */
export const WhatsAppBrandBadge: React.FC<{
  className?: string;
  iconClassName?: string;
}> = ({ className = 'w-10 h-10 rounded-xl', iconClassName = 'w-5 h-5 fill-white' }) => {
  return (
    <div
      className={`${className} bg-[#25D366] flex items-center justify-center text-white shadow-sm shadow-[#25D366]/30 transition-transform`}
    >
      <WhatsAppIcon className={iconClassName} />
    </div>
  );
};
