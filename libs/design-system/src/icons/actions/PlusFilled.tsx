import React from 'react';

export function PlusFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect width="24" height="24" rx="4" fill="url(#paint0_linear_375_800)" />
      <path
        d="M7.19995 12H16.8M12 7.20001V16.8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_375_800" x1="0" y1="12" x2="24" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD2476" />
          <stop offset="1" stopColor="#FF512F" />
        </linearGradient>
      </defs>
    </svg>
  );
}
