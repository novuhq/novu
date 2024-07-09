import React from 'react';

export function Mali(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193719)">
        <path
          d="M26.957 1.244A19.957 19.957 0 0020 0c-2.446 0-4.79.44-6.956 1.244L11.304 20l1.74 18.756A19.955 19.955 0 0020 40c2.447 0 4.79-.44 6.957-1.244L28.696 20l-1.74-18.756z"
          fill="#FFDA44"
        />
        <path d="M40 20c0-8.6-5.427-15.93-13.043-18.756v37.512C34.573 35.93 40.001 28.6 40.001 20z" fill="#D80027" />
        <path d="M0 20c0 8.6 5.428 15.93 13.043 18.756V1.244C5.428 4.07 0 11.401 0 20z" fill="#6DA544" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193719">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
