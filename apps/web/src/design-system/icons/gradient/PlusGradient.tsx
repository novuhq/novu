import React from 'react';
/* eslint-disable */
export function PlusGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="30" height="31" viewBox="0 0 30 31" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9 14C8.17157 14 7.5 14.6716 7.5 15.5C7.5 16.3284 8.17157 17 9 17V14ZM21 17C21.8284 17 22.5 16.3284 22.5 15.5C22.5 14.6716 21.8284 14 21 14V17ZM16.5 9.5C16.5 8.67157 15.8284 8 15 8C14.1716 8 13.5 8.67157 13.5 9.5H16.5ZM13.5 21.5C13.5 22.3284 14.1716 23 15 23C15.8284 23 16.5 22.3284 16.5 21.5H13.5ZM9 17H21V14H9V17ZM13.5 9.5V21.5H16.5V9.5H13.5Z"
        fill="url(#paint0_linear_440_1987)"
      />
      <defs>
        <linearGradient id="paint0_linear_440_1987" x1="15" y1="21.5" x2="15" y2="9.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
