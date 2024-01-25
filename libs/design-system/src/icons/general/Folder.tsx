/* eslint-disable max-len */
import React from 'react';

export function Folder(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" {...props}>
      <mask
        id="mask0_2372_138258"
        style={{ maskType: 'alpha' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="20"
        height="20"
      >
        <rect width="20" height="20" fill="#D9D9D9" />
      </mask>
      <g mask="url(#mask0_2372_138258)">
        <path
          d="M3.5 16C3.09722 16 2.74653 15.8507 2.44792 15.5521C2.14931 15.2535 2 14.9028 2 14.5V5.5C2 5.08333 2.14931 4.72917 2.44792 4.4375C2.74653 4.14583 3.09722 4 3.5 4H8L10 6H16.5C16.9167 6 17.2708 6.14583 17.5625 6.4375C17.8542 6.72917 18 7.08333 18 7.5V14.5C18 14.9028 17.8542 15.2535 17.5625 15.5521C17.2708 15.8507 16.9167 16 16.5 16H3.5Z"
          fill="#525266"
        />
      </g>
    </svg>
  );
}
