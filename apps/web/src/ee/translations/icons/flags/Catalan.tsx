import React from 'react';

export function Catalan(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" {...props}>
      <g clipPath="url(#clip0_2435_78752)">
        <mask
          id="mask0_2435_78752"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="40"
          height="40"
        >
          <path
            d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
            fill="#FFDA44"
          />
        </mask>
        <g mask="url(#mask0_2435_78752)">
          <path d="M50.25 0H-9.75V40H50.25V0Z" fill="#FFDA44" />
          <path
            d="M-9.75 6.66667H50.25H-9.75ZM50.25 15.5556H-9.75H50.25ZM-9.75 24.4445H50.25H-9.75ZM50.25 33.3333H-9.75H50.25Z"
            fill="black"
          />
          <path
            d="M-9.75 6.66667H50.25M50.25 15.5556H-9.75M-9.75 24.4444H50.25M50.25 33.3333H-9.75"
            stroke="#D80027"
            strokeWidth="4.44445"
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_2435_78752">
          <rect width="40" height="40" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
