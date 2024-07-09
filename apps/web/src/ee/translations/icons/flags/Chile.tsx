import React from 'react';

export function Chile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192511)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path d="M40 20c0 11.046-8.954 20-20 20S0 31.046 0 20s20 0 20 0h20z" fill="#D80027" />
        <path d="M0 20C0 8.954 8.954 0 20 0v20H0z" fill="#0052B4" />
        <path
          d="M11.906 6.956l1.295 3.986h4.19l-3.39 2.463 1.295 3.986-3.39-2.463-3.39 2.463 1.294-3.985-3.39-2.464h4.19l1.296-3.986z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192511">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
