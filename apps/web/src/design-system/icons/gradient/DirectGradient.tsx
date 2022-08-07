import React from 'react';
/* eslint-disable */
export function DirectGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none" {...props}>
      <path
        d="M25 5L14 16M25 5L18 25L14 16M25 5L5 12L14 16"
        stroke="url(#paint0_linear_2873_32232)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_2873_32232" x1="15" y1="25" x2="15" y2="5" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF512F" />
          <stop offset="1" stop-color="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
