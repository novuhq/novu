import React from 'react';

export function Repeat(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g clipPath="url(#clip0_1059_22002)">
        <path
          d="M14.1667 0.833252L17.5 4.16659L14.1667 7.49992"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2.5 9.16675V7.50008C2.5 6.61603 2.85119 5.76818 3.47631 5.14306C4.10143 4.51794 4.94928 4.16675 5.83333 4.16675H17.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.83333 19.1667L2.5 15.8333L5.83333 12.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 10.8333V12.4999C17.5 13.384 17.1488 14.2318 16.5237 14.8569C15.8986 15.4821 15.0507 15.8333 14.1667 15.8333H2.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1059_22002">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
