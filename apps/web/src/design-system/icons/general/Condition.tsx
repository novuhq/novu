import React from 'react';

export function Condition(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      color="#828299"
      {...props}
    >
      <g id="Icon filter" clipPath="url(#clip0_5047_8523)">
        <g id="filter_list">
          <mask id="mask0_5047_8523" maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
            <rect id="Bounding box" width="16" height="16" fill="#D9D9D9" />
          </mask>
          <g mask="url(#mask0_5047_8523)">
            <path
              id="filter_list_2"
              d="M6.66667 12V10.6667H9.33333V12H6.66667ZM4 8.66667V7.33333H12V8.66667H4ZM2 5.33333V4H14V5.33333H2Z"
              fill="currentColor"
            />
          </g>
        </g>
      </g>
      <defs>
        <clipPath id="clip0_5047_8523">
          <rect width="16" height="16" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
}
