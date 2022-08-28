import React from 'react';
/* eslint-disable */
export function ChatGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none" {...props}>
      <path
        d="M25 5L14 16M25 5L18 25L14 16M25 5L5 12L14 16"
        stroke="url(#paint0_linear_2873_32232)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_2873_32232" x1="15" y1="25" x2="15" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
