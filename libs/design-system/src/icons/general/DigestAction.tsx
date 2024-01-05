/* eslint-disable max-len */
import React from 'react';

export function DigestAction(props: React.ComponentPropsWithoutRef<'svg'>) {
  const id = Date.now();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
      data-blue-gradient-svg
      {...props}
    >
      <mask
        id="mask0_528_4359"
        style={{ maskType: 'alpha' }}
        width="24"
        height="24"
        x="0"
        y="0"
        maskUnits="userSpaceOnUse"
      >
        <path fill="#525266" d="M0 0H24V24H0z"></path>
      </mask>
      <g mask="url(#mask0_528_4359)">
        <path
          fill={`url(#${id})`}
          d="M12 22c-.55 0-1.02-.196-1.412-.587A1.926 1.926 0 0110 20v-8c0-.55.196-1.02.588-1.412A1.926 1.926 0 0112 10h8c.55 0 1.02.196 1.413.588.391.391.587.862.587 1.412v8c0 .55-.196 1.02-.587 1.413A1.926 1.926 0 0120 22h-8zm0-2h8v-8h-8v8zm-6-2V8c0-.55.196-1.02.588-1.412A1.926 1.926 0 018 6h10v2H8v10H6zm-4-4V4c0-.55.196-1.02.587-1.413A1.926 1.926 0 014 2h10v2H4v10H2z"
        ></path>
      </g>
      <defs>
        <linearGradient id={String(id)} x1="2" x2="22" y1="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#525266"></stop>
          <stop offset="1" stopColor="#525266"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
