import React from 'react';

export function CostaRica(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193410)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M38.756 13.043H1.244A19.957 19.957 0 000 20c0 2.446.44 4.79 1.244 6.956h37.512A19.957 19.957 0 0040 20c0-2.447-.44-4.79-1.244-6.957z"
          fill="#D80027"
        />
        <path
          d="M20 0C13.94 0 8.509 2.697 4.84 6.956h30.322C31.494 2.697 26.062 0 20 0zM35.162 33.044H4.84C8.508 37.303 13.94 40 20 40c6.063 0 11.494-2.697 15.162-6.956z"
          fill="#0052B4"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193410">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
