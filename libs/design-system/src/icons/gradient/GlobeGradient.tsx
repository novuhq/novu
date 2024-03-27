import React from 'react';
/* eslint-disable */
export function GlobeGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="31" height="31" viewBox="0 0 31 31" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M15.75 28C22.6536 28 28.25 22.4036 28.25 15.5C28.25 8.59644 22.6536 3 15.75 3C8.84644 3 3.25 8.59644 3.25 15.5C3.25 22.4036 8.84644 28 15.75 28Z"
        stroke="url(#paint0_linear_240_2434)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.25 15.5H28.25"
        stroke="url(#paint1_linear_240_2434)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.75 3C18.8766 6.42294 20.6534 10.865 20.75 15.5C20.6534 20.135 18.8766 24.5771 15.75 28C12.6234 24.5771 10.8466 20.135 10.75 15.5C10.8466 10.865 12.6234 6.42294 15.75 3V3Z"
        stroke="url(#paint2_linear_240_2434)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_240_2434" x1="15.75" y1="28" x2="15.75" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_240_2434"
          x1="15.75"
          y1="16.5"
          x2="15.75"
          y2="15.5"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
        <linearGradient id="paint2_linear_240_2434" x1="15.75" y1="28" x2="15.75" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
