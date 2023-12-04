/* eslint-disable max-len */
import React from 'react';

export function EmailFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        d="M20.659 8.958a.212.212 0 01.341.165v7.19c0 .931-.756 1.687-1.688 1.687H4.688A1.688 1.688 0 013 16.312V9.128c0-.176.2-.275.341-.166.788.612 1.832 1.389 5.418 3.994.741.541 1.993 1.68 3.241 1.674 1.255.01 2.531-1.154 3.245-1.674 3.586-2.605 4.627-3.385 5.414-3.997zM12 13.5c.816.014 1.99-1.027 2.58-1.456 4.666-3.385 5.02-3.68 6.097-4.524A.841.841 0 0021 6.855v-.668c0-.931-.756-1.687-1.688-1.687H4.688C3.756 4.5 3 5.256 3 6.188v.667c0 .26.12.503.323.665 1.076.84 1.431 1.139 6.097 4.524.59.43 1.764 1.47 2.58 1.456z"
      ></path>
      <defs>
        <linearGradient id={String(id)} x1="3" x2="21" y1="11.25" y2="11.25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
