import React from 'react';

export function Turkey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193799)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#D80027" />
        <path
          d="M19.18 16.343l1.642 2.261 2.658-.862-1.644 2.26 1.64 2.26-2.656-.864-1.643 2.26.001-2.795-2.657-.865 2.658-.861.002-2.794z"
          fill="#F0F0F0"
        />
        <path
          d="M14.703 25.652a5.652 5.652 0 112.688-10.625 6.956 6.956 0 100 9.945c-.8.434-1.715.68-2.688.68z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193799">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
