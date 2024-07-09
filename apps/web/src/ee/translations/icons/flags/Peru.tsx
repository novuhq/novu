import React from 'react';

export function Peru(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193864)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M40 20c0-8.6-5.427-15.93-13.043-18.756v37.512C34.573 35.93 40.001 28.6 40.001 20zM0 20c0 8.6 5.428 15.93 13.043 18.756V1.244C5.428 4.07 0 11.401 0 20z"
          fill="#D80027"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193864">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
