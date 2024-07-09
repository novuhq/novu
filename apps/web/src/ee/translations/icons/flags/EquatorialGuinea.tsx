import React from 'react';

export function EquatorialGuinea(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_192975)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M12.175 13.043h26.582C35.93 5.428 28.6 0 20 0A19.935 19.935 0 005.859 5.859l6.316 7.184z"
          fill="#6DA544"
        />
        <path
          d="M12.175 26.956h26.582C35.93 34.573 28.6 40 20 40a19.935 19.935 0 01-14.142-5.858l6.316-7.186z"
          fill="#D80027"
        />
        <path d="M5.858 5.858c-7.81 7.81-7.81 20.474 0 28.284L20 20 5.858 5.858z" fill="#0052B4" />
        <path
          d="M23.479 16.522v4.348c0 2.662 3.478 3.478 3.478 3.478s3.478-.816 3.478-3.479v-4.347H23.48z"
          fill="#DEDDE0"
        />
        <path d="M26.088 20.087h1.739v2.522h-1.74v-2.522z" fill="#786145" />
        <path d="M28.695 19.13a1.74 1.74 0 10-3.478 0 .87.87 0 000 1.74h3.479a.87.87 0 000-1.74z" fill="#6DA544" />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_192975">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
