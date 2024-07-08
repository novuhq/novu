import React from 'react';

export function Benin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193161)">
        <path
          d="M13.043 18.26l1.74 21.051A20.02 20.02 0 0020 40c11.045 0 20-8.954 20-20l-26.957-1.74z"
          fill="#D80027"
        />
        <path d="M13.043 20L14.782.689A20.022 20.022 0 0120 0c11.045 0 20 8.954 20 20H13.042z" fill="#FFDA44" />
        <path d="M0 20c0 9.24 6.267 17.016 14.783 19.311V.689C6.267 2.984 0 10.759 0 20z" fill="#6DA544" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193161">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
