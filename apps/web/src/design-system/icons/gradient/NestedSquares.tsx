import React from 'react';

export function NestedSquares(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="33" viewBox="0 0 32 33" fill="none" {...props}>
      <path
        /* eslint-disable-next-line max-len */
        d="M11.9999 1.83301V5.83301M19.9999 1.83301V5.83301M11.9999 27.1663V31.1663M19.9999 27.1663V31.1663M26.6666 12.4997H30.6666M26.6666 19.1663H30.6666M1.33325 12.4997H5.33325M1.33325 19.1663H5.33325M7.99992 5.83301H23.9999C25.4727 5.83301 26.6666 7.02692 26.6666 8.49967V24.4997C26.6666 25.9724 25.4727 27.1663 23.9999 27.1663H7.99992C6.52716 27.1663 5.33325 25.9724 5.33325 24.4997V8.49967C5.33325 7.02692 6.52716 5.83301 7.99992 5.83301ZM11.9999 12.4997H19.9999V20.4997H11.9999V12.4997Z"
        stroke="url(#paint0_linear_300_1960)"
        strokeWidth="2.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="paint0_linear_300_1960"
          x1="15.9999"
          y1="31.1663"
          x2="15.9999"
          y2="1.83301"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
