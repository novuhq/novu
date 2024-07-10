import React from 'react';

export function BurkinaFaso(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193507)">
        <path d="M0 20C0 8.954 8.954 0 20 0s20 8.954 20 20c-.87 0-20 2.609-20 2.609L0 20z" fill="#D80027" />
        <path d="M40 20c0 11.046-8.954 20-20 20S0 31.046 0 20" fill="#6DA544" />
        <path
          d="M20 13.043l1.51 4.65h4.89l-3.955 2.874 1.51 4.65L20 22.344l-3.956 2.873 1.511-4.65-3.955-2.874h4.889l1.51-4.65z"
          fill="#FFDA44"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193507">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
