import React from 'react';
/* eslint-disable */
export function CompassGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M15.25 28C22.1536 28 27.75 22.4036 27.75 15.5C27.75 8.59644 22.1536 3 15.25 3C8.34644 3 2.75 8.59644 2.75 15.5C2.75 22.4036 8.34644 28 15.25 28Z"
        stroke="url(#paint0_linear_240_2428)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5502 10.2L17.9002 18.1499L9.9502 20.7999L12.6002 12.85L20.5502 10.2Z"
        stroke="url(#paint1_linear_240_2428)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_240_2428" x1="15.25" y1="28" x2="15.25" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_240_2428"
          x1="15.2502"
          y1="20.7999"
          x2="15.2502"
          y2="10.2"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
