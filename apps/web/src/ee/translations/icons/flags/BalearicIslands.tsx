import React from 'react';

export function BalearicIslands(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193491)">
        <path d="M20 0c11.046 0 20 8.954 20 20s-8.954 20-20 20S0 31.046 0 20" fill="#FFDA44" />
        <path
          d="M19.564 8.889H36.63a20.112 20.112 0 00-4.061-4.444H19.564v4.444zM19.564 17.778h20.312a19.884 19.884 0 00-1.016-4.444H19.564v4.444zM1.14 26.667h37.72c.5-1.416.846-2.904 1.016-4.445H.123c.17 1.541.516 3.03 1.016 4.445zM7.43 35.556h25.14a20.112 20.112 0 004.061-4.445H3.37a20.112 20.112 0 004.061 4.445z"
          fill="#D80027"
        />
        <path d="M20 0C8.954 0 0 8.954 0 20h20V0z" fill="#4A1F63" />
        <path
          d="M16.522 10.435v1.74h-.87v-1.74h-1.739v1.74h-.87v-3.48H9.565v3.48h-.87v-1.74H6.957v1.74h-.87v-1.74H4.349v5.217H18.26v-5.217h-1.74z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193491">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
