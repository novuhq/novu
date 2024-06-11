import React from 'react';

export function ArrowForward(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" fill="none" viewBox="0 0 21 20" {...props}>
      <mask
        id="mask0_264_136399"
        style={{ maskType: 'alpha' }}
        width="21"
        height="20"
        x="0"
        y="0"
        maskUnits="userSpaceOnUse"
      >
        <path fill="#D9D9D9" d="M0.5 0H20.5V20H0.5z"></path>
      </mask>
      <g mask="url(#mask0_264_136399)">
        <path
          fill="#525266"
          d="M13.625 10.75H4.5v-1.5h9.125L9.437 5.062 10.5 4l6 6-6 6-1.063-1.063 4.188-4.187z"
        ></path>
      </g>
    </svg>
  );
}
