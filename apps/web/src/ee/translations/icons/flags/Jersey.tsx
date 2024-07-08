import React from 'react';

export function Jersey(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193458)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#EFEFEF" />
        <path
          d="M35.867 32.178L23.689 20 35.867 7.822a20.22 20.22 0 00-3.69-3.689L20 16.311 7.822 4.133a20.191 20.191 0 00-3.69 3.69L16.312 20 4.133 32.178a20.222 20.222 0 003.689 3.69L20 23.688l12.178 12.178a20.185 20.185 0 003.689-3.69z"
          fill="#D80027"
        />
        <path
          d="M16.521 6.087l3.479.87 3.478-.87V3.131l-1.391.695L20 1.74l-2.087 2.087-1.392-.695v2.956z"
          fill="#FFDA44"
        />
        <path
          d="M16.521 6.087V8.26c0 2.663 3.479 3.478 3.479 3.478s3.478-.816 3.478-3.478V6.087h-6.957z"
          fill="#D80027"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193458">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
