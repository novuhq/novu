import React from 'react';

export function Madagascar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194276)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F2F2F2" />
        <path
          d="M13.043 20v18.756A19.954 19.954 0 0020 40c11.045 0 20-8.954 20-20s-26.957 0-26.957 0z"
          fill="#6DA544"
        />
        <path d="M20 0c-2.447 0-4.79.44-6.957 1.244V20h26.956C40 8.954 31.045 0 20 0z" fill="#D80027" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194276">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
