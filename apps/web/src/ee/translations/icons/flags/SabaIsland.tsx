import React from 'react';

export function SabaIsland(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_194225)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M20 0C19.981-.014-.005 19.995 0 20 0 8.954 8.954 0 20 0zM20 0c.019-.014 20.005 19.995 20 20C40 8.954 31.046 0 20 0z"
          fill="#D80027"
        />
        <path
          d="M20 40c-.019.014-20.005-19.995-20-20 0 11.046 8.954 20 20 20zM20 40c.019.014 20.005-19.995 20-20 0 11.046-8.954 20-20 20z"
          fill="#0052B4"
        />
        <path
          d="M20 10.435l2.159 6.643h6.985l-5.651 4.105 2.158 6.643-5.65-4.105-5.651 4.105 2.158-6.643-5.65-4.105h6.984l2.159-6.643z"
          fill="#FFDA44"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_194225">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
