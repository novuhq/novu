import React from 'react';

export function ConditionPlus(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <mask
        id="mask0_3918_57495"
        style={{ maskType: 'alpha' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="16"
        height="16"
      >
        <rect width="16" height="16" fill="currentColor" />
      </mask>
      <g mask="url(#mask0_3918_57495)">
        <path
          d="M6.66667 12V10.6667H9V12H6.66667ZM4 8.66667V7.33333H11V8.66667H4ZM2 5.33333V4H14V5.33333H2Z"
          fill="currentColor"
        />
        <path
          d="M12.5 11.8333V13.8333H13.8333V11.8333H15.8333V10.5H13.8333V8.5H12.5V10.5H10.5V11.8333H12.5Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
