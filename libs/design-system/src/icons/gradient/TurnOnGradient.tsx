import React from 'react';
import { ISvgPropsInterface } from '../interfaces/svg-props.interface';
/* eslint-disable */

export function TurnOnGradient({ stopColor, offSetStopColor, ...props }: ISvgPropsInterface) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 22 24" fill="none" {...props}>
      <path
        d="M18.0722 6.10325C19.4704 7.48772 20.4225 9.25148 20.8081 11.1715C21.1937 13.0916 20.9955 15.0817 20.2385 16.8902C19.4815 18.6987 18.1998 20.2445 16.5554 21.332C14.9109 22.4195 12.9777 23 11 23C9.02233 23 7.08906 22.4195 5.44464 21.332C3.80022 20.2445 2.51849 18.6987 1.76152 16.8902C1.00455 15.0817 0.806325 13.0916 1.19191 11.1715C1.5775 9.25148 2.52958 7.48772 3.92778 6.10325M11.0056 1V11.9984"
        stroke="url(#paint0_linear_1020_1949)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_1020_1949" x1="11" y1="23" x2="11" y2="1" gradientUnits="userSpaceOnUse">
          <stop stopColor={stopColor ?? '#FF512F'} />
          <stop offset="1" stopColor={offSetStopColor ?? '#DD2476'} />
        </linearGradient>
      </defs>
    </svg>
  );
}
