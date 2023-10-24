import React from 'react';
/* eslint-disable */
export function Lock(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5 15.25C5 13.3644 5 12.4216 5.58579 11.8358C6.17157 11.25 7.11438 11.25 9 11.25H21C22.8856 11.25 23.8284 11.25 24.4142 11.8358C25 12.4216 25 13.3644 25 15.25V20.25C25 23.0784 25 24.4926 24.1213 25.3713C23.2426 26.25 21.8284 26.25 19 26.25H11C8.17157 26.25 6.75736 26.25 5.87868 25.3713C5 24.4926 5 23.0784 5 20.25V15.25Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 10V8.75C20 5.98858 17.7614 3.75 15 3.75V3.75C12.2386 3.75 10 5.98858 10 8.75V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="15" cy="18.75" r="2.5" fill="currentColor" />
    </svg>
  );
}
