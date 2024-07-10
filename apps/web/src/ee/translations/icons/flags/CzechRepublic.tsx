import React from 'react';

export function CzechRepublic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192855)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M18.26 20S5.87 34.145 5.857 34.142A19.937 19.937 0 0020 40c11.045 0 20-8.954 20-20H18.26z"
          fill="#D80027"
        />
        <path d="M5.858 5.858c-7.81 7.81-7.81 20.474 0 28.284L20 20 5.858 5.858z" fill="#0052B4" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192855">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
