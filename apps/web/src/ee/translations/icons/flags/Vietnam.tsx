import React from 'react';

export function Vietnam(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194372)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#D80027" />
        <path
          d="M20 10.435l2.159 6.643h6.985l-5.651 4.105 2.158 6.643-5.65-4.105-5.651 4.105 2.158-6.643-5.65-4.105h6.984l2.159-6.643z"
          fill="#FFDA44"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194372">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
