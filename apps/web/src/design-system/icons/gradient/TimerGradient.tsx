import React from 'react';
/* eslint-disable */
export function TimerGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M12 5.9V12.5L16.4 14.7M23 12.5C23 18.5751 18.0751 23.5 12 23.5C5.92487 23.5 1 18.5751 1 12.5C1 6.42487 5.92487 1.5 12 1.5C18.0751 1.5 23 6.42487 23 12.5Z"
        stroke="url(#paint0_linear_3519_36042)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_3519_36042" x1="12" y1="23.5" x2="12" y2="1.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14DEEB" />
          <stop offset="1" stopColor="#446EDC" />
        </linearGradient>
      </defs>
    </svg>
  );
}
