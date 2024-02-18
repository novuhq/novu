/* eslint-disable max-len */
import React from 'react';

export function Avatar(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M7 8C9.1875 8 11 6.21875 11 4C11 1.8125 9.1875 0 7 0C4.78125 0 3 1.8125 3 4C3 6.21875 4.78125 8 7 8ZM8.5625 9.5H5.40625C2.40625 9.5 0 11.9375 0 14.9375C0 15.5312 0.46875 16 1.0625 16H12.9062C13.5 16 14 15.5312 14 14.9375C14 11.9375 11.5625 9.5 8.5625 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
