import React from 'react';

import { ISvgPropsInterface } from '../interfaces/svg-props.interface';
/* eslint-disable */
export function MailGradient({ disabled = false, width = '30px', height = '31px', ...props }: ISvgPropsInterface) {
  return (
    <svg width={width} height={height} viewBox="0 0 30 31" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M24 9L15 15.75L6 9M7 7.5H23C24.1 7.5 25 8.4 25 9.5V21.5C25 22.6 24.1 23.5 23 23.5H7C5.9 23.5 5 22.6 5 21.5V9.5C5 8.4 5.9 7.5 7 7.5Z"
        stroke={!disabled ? 'url(#paint0_linear_440_2017)' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_440_2017" x1="15" y1="23.5" x2="15" y2="7.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
