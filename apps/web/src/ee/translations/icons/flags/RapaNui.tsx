import React from 'react';

export function RapaNui(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194653)">
        <path
          d="M39.5 20c0 10.77-8.73 19.5-19.5 19.5S.5 30.77.5 20 9.23.5 20 .5 39.5 9.23 39.5 20z"
          fill="#FCFCFC"
          stroke="#F3F3F3"
        />
        <path
          d="M26.087 16.522v1.739h2.387a10.485 10.485 0 01-3.864 3.275 2.174 2.174 0 00-3.687 1.031 10.535 10.535 0 01-1.845 0 2.174 2.174 0 00-3.687-1.03 10.483 10.483 0 01-3.865-3.276h2.387v-1.74H7.826c0 6.724 5.45 12.175 12.174 12.175 6.724 0 12.174-5.45 12.174-12.174h-6.087z"
          fill="#D80027"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194653">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
