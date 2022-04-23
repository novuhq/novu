import React from 'react';
/* eslint-disable */
export function GradientDot(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="6.5"
        fill="url(#paint0_linear_1722_2699)"
        stroke="currentColor"
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="paint0_linear_1722_2699" x1="8" y1="13" x2="8" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
