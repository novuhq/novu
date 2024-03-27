/* eslint-disable max-len */
import React from 'react';

export function InAppFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        d="M12 21c1.183 0 2.142-1.007 2.142-2.25H9.858c0 1.243.96 2.25 2.142 2.25zm7.212-5.263c-.647-.73-1.858-1.828-1.858-5.425 0-2.731-1.824-4.918-4.283-5.454v-.733C13.07 3.504 12.59 3 12 3s-1.07.504-1.07 1.125v.733c-2.46.536-4.284 2.723-4.284 5.455 0 3.596-1.21 4.694-1.858 5.424-.2.226-.29.498-.288.763.004.577.435 1.125 1.075 1.125h12.85c.64 0 1.072-.548 1.075-1.125a1.128 1.128 0 00-.288-.763z"
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
