import React from 'react';

export function BoltOutlinedGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 32 32" {...props}>
      <path
        stroke="url(#paint0_linear_244_7514)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M17.5 3.667l-12 14.4h10.8l-1.2 9.6 12-14.4H16.3l1.2-9.6z"
      ></path>
      <defs>
        <linearGradient
          id="paint0_linear_244_7514"
          x1="5.5"
          x2="27.1"
          y1="15.667"
          y2="15.667"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#DD2476"></stop>
          <stop offset="1" stopColor="#FF512F"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
