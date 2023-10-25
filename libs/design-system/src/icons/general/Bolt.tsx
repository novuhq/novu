import React from 'react';

export function Bolt(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M9.83333 1.6665L1.5 11.6665H9L8.16667 18.3332L16.5 8.33317H9L9.83333 1.6665Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}
