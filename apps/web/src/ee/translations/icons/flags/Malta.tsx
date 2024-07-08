import React from 'react';

export function Malta(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193832)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path d="M20 0c11.046 0 20 8.954 20 20s-8.954 20-20 20" fill="#D80027" />
        <path
          d="M13.913 7.826V5.217h-2.609v2.61H8.695v2.608h2.61v2.608h2.608v-2.608h2.608V7.826h-2.608z"
          fill="#ACABB1"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193832">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
