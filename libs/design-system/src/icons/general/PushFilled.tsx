/* eslint-disable max-len */
import React from 'react';

export function PushFilled(props: React.ComponentPropsWithoutRef<'svg'>) {
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
        d="M16.2 3H7.8C6.806 3 6 3.756 6 4.688v14.625C6 20.244 6.806 21 7.8 21h8.4c.994 0 1.8-.756 1.8-1.688V4.688C18 3.756 17.194 3 16.2 3zM12 19.875c-.664 0-1.2-.503-1.2-1.125s.536-1.125 1.2-1.125c.664 0 1.2.503 1.2 1.125s-.536 1.125-1.2 1.125zm4.2-3.797c0 .232-.202.422-.45.422h-7.5c-.248 0-.45-.19-.45-.422V5.11c0-.232.202-.421.45-.421h7.5c.248 0 .45.19.45.421v10.97z"
      ></path>
      <defs>
        <linearGradient id={String(id)} x1="6" x2="18" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
