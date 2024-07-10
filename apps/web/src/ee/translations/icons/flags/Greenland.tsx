import React from 'react';

export function Greenland(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192879)">
        <path d="M0 20C0 8.954 8.954 0 20 0s20 8.954 20 20c-.87 0-20 2.609-20 2.609L0 20z" fill="#F0F0F0" />
        <path d="M40 20c0 11.046-8.954 20-20 20S0 31.046 0 20" fill="#D80027" />
        <path
          d="M13.913 29.565A9.565 9.565 0 0023.478 20a9.565 9.565 0 00-19.13 0 9.565 9.565 0 009.565 9.565z"
          fill="#F0F0F0"
        />
        <path d="M4.348 20a9.565 9.565 0 0119.13 0" fill="#D80027" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192879">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
