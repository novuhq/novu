import React from 'react';

export function IvoryCoast(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193121)">
        <path
          d="M20 40c2.446 0 4.79-.44 6.956-1.244L27.826 20l-.87-18.756A19.958 19.958 0 0020 0c-2.447 0-4.79.44-6.957 1.244L12.173 20l.87 18.756A19.955 19.955 0 0020 40z"
          fill="#F0F0F0"
        />
        <path d="M0 20c0 8.6 5.428 15.93 13.043 18.756V1.244C5.428 4.07 0 11.401 0 20z" fill="#FF9811" />
        <path
          d="M26.957 1.244v37.512C34.573 35.93 40.001 28.6 40.001 20c0-8.6-5.428-15.93-13.044-18.756z"
          fill="#6DA544"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193121">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
