/* eslint-disable max-len */
import React from 'react';

export function Camera(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M14.5 2H11.75L11.3438 1C11.125 0.40625 10.5625 0 9.9375 0H6.03125C5.40625 0 4.84375 0.40625 4.625 1L4.25 2H1.5C0.65625 2 0 2.6875 0 3.5V12.5C0 13.3438 0.65625 14 1.5 14H14.5C15.3125 14 16 13.3438 16 12.5V3.5C16 2.6875 15.3125 2 14.5 2ZM8 11C6.34375 11 5 9.65625 5 8C5 6.34375 6.34375 5 8 5C9.65625 5 11 6.34375 11 8C11 9.65625 9.65625 11 8 11Z"
        fill="currentColor"
      />
    </svg>
  );
}
