/* eslint-disable max-len */
import React from 'react';

export function SmsFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        d="M18.75 3H5.25A2.252 2.252 0 003 5.25v10.124c0 1.241 1.009 2.25 2.25 2.25h3.375v2.953c0 .345.393.545.671.341l4.39-3.294h5.063c1.241 0 2.25-1.009 2.25-2.25V5.25c0-1.241-1.009-2.25-2.25-2.25z"
      ></path>
      <defs>
        <linearGradient id={String(id)} x1="3" x2="20.999" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
