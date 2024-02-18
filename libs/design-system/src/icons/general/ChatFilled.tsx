/* eslint-disable max-len */
import React from 'react';

export function ChatFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        d="M19.73 3.114L3.44 12.513a.844.844 0 00.077 1.518l3.737 1.567 10.098-8.9c.193-.171.468.092.302.293L9.186 17.307v2.83c0 .829 1.002 1.156 1.494.555l2.232-2.717 4.38 1.834a.846.846 0 001.16-.64l2.53-15.184c.12-.71-.643-1.223-1.251-.871z"
      ></path>
      <defs>
        <linearGradient id={String(id)} x1="3" x2="20.994" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
