import React from 'react';

export function Panama(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194645)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path d="M0 20c0 11.046 8.954 20 20 20V20H0z" fill="#0052B4" />
        <path d="M20 0c11.046 0 20 8.954 20 20H20V0z" fill="#D80027" />
        <path
          d="M11.906 6.957l1.295 3.985h4.19l-3.39 2.464 1.295 3.985-3.39-2.463-3.39 2.463 1.294-3.985-3.39-2.464h4.19l1.296-3.985z"
          fill="#0052B4"
        />
        <path
          d="M28.095 22.609l1.295 3.985h4.191l-3.39 2.464 1.295 3.986-3.39-2.464-3.391 2.464L26 29.058l-3.39-2.464h4.19l1.295-3.985z"
          fill="#D80027"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194645">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
