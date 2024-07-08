import React from 'react';

export function Mauritius(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194284)">
        <path
          d="M2.432 10.435L20 12.174l17.568-1.74C34.176 4.219 27.581 0 20 0 12.419 0 5.824 4.218 2.432 10.435z"
          fill="#D80027"
        />
        <path
          d="M2.432 29.565L20 31.305l17.568-1.74A19.91 19.91 0 0040 20l-20-1.74L0 20c0 3.465.881 6.724 2.432 9.565z"
          fill="#FFDA44"
        />
        <path d="M2.432 10.435A19.91 19.91 0 000 20h40a19.91 19.91 0 00-2.432-9.565H2.432z" fill="#0052B4" />
        <path d="M20 40c7.58 0 14.176-4.218 17.568-10.435H2.432C5.824 35.782 12.419 40 20 40z" fill="#6DA544" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194284">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
