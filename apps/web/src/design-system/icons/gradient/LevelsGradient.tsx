import React from 'react';
/* eslint-disable */
export function LevelsGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M4 19V12M4 8V1M12 19V10M12 6V1M20 19V14M20 10V1M1 12H7M9 6H15M17 14H23"
        stroke="url(#paint0_linear_3297_35030)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_3297_35030" x1="12" y1="19" x2="12" y2="1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
