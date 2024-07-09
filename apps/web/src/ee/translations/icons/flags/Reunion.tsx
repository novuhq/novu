import React from 'react';

export function Reunion(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" {...props}>
      <g clipPath="url(#clip0_2435_78712)">
        <mask
          id="mask0_2435_78712"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="40"
          height="40"
        >
          <path
            d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
            fill="#F0F0F0"
          />
        </mask>
        <g mask="url(#mask0_2435_78712)">
          <path
            d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
            fill="#F0F0F0"
          />
          <path d="M-10 0H50V40H-10V0Z" fill="#0052B4" />
          <path d="M20 20L-10 40H50L20 20Z" fill="#D80027" />
          <path d="M-10 18.5V21.5L50 18.5V21.5L-10 18.5Z" fill="#FFDA44" />
          <path d="M20 20L-10 2.5V0H-7.5L20 20ZM20 20L47.5 0H50V2.5L20 20Z" fill="#FFDA44" />
          <path d="M20 20L18.5 0H21.5L20 20Z" fill="#FFDA44" />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_2435_78712">
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
