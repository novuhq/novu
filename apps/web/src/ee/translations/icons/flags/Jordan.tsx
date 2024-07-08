import React from 'react';

export function Jordan(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={40} height={40} fill="none" {...props}>
      <g clipPath="url(#prefix__clip0_568_193571)">
        <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F0F0F0" />
        <path
          d="M12.175 13.043h26.582C35.93 5.428 28.6 0 20 0A19.935 19.935 0 005.859 5.859l6.316 7.184z"
          fill="#000"
        />
        <path
          d="M12.175 26.956h26.582C35.93 34.573 28.6 40 20 40a19.935 19.935 0 01-14.142-5.858l6.316-7.186z"
          fill="#6DA544"
        />
        <path d="M5.858 5.858c-7.81 7.81-7.81 20.474 0 28.284L20 20 5.858 5.858z" fill="#D80027" />
        <path
          d="M7.938 15.652l1.098 2.296 2.479-.573-1.11 2.289 1.993 1.58-2.482.56.007 2.544-1.985-1.592-1.985 1.592.007-2.544-2.481-.56 1.993-1.58-1.11-2.29 2.478.574 1.098-2.296z"
          fill="#F0F0F0"
        />
      </g>
      <defs>
        <clipPath id="prefix__clip0_568_193571">
          <path fill="#fff" d="M0 0h40v40H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
