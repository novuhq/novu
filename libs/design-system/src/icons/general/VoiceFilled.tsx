/* eslint-disable max-len */
import React from 'react';

export function VoiceFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
  const id = Date.now();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      data-workflow-node-icon
      {...props}
    >
      <path
        fill={`url(#${id})`}
        d="M3.51089 2L7.15002 2.13169C7.91653 2.15942 8.59676 2.64346 8.89053 3.3702L9.96656 6.03213C10.217 6.65159 10.1496 7.35837 9.78693 7.91634L8.40831 10.0375C9.22454 11.2096 11.4447 13.9558 13.7955 15.5633L15.5484 14.4845C15.9939 14.2103 16.5273 14.1289 17.0314 14.2581L20.5161 15.1517C21.4429 15.3894 22.0674 16.2782 21.9942 17.2552L21.7705 20.2385C21.6919 21.2854 20.8351 22.1069 19.818 21.9887C6.39245 20.4276 -1.48056 1.99997 3.51089 2Z"
      ></path>
      <defs>
        <linearGradient id={String(id)} x1="4.5" x2="19.5" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
