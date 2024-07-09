import React from 'react';

export function Guernsey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193329)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M39.83 17.391H22.61V.17a20.198 20.198 0 00-5.218 0v17.222H.17a20.198 20.198 0 000 5.218h17.222V39.83a20.193 20.193 0 005.218 0V22.609H39.83a20.193 20.193 0 000-5.218z"
          fill="#D80027"
        />
        <path
          d="M25.652 20.87l1.304.87v-3.48l-1.304.87h-4.783v-4.782l.87-1.305H18.26l.87 1.305v4.782h-4.783l-1.304-.87v3.48l1.304-.87h4.783v4.782l-.87 1.304h3.479l-.87-1.304V20.87h4.783z"
          fill="#FFDA44"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193329">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
