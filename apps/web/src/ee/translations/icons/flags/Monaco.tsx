import React from 'react';

export function Monaco(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193727)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path d="M0 20C0 8.954 8.954 0 20 0s20 8.954 20 20" fill="#D80027" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193727">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
