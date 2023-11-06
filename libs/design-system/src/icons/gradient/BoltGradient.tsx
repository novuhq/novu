import React from 'react';
/* eslint-disable */
export function BoltGradient(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="17" viewBox="0 0 13 17" fill="none" {...props}>
      <path
        d="M12.4062 9.78125C12.7188 9.5 12.8125 9.0625 12.6562 8.65625C12.5312 8.28125 12.1562 8.03125 11.7188 8.03125H8.25L10.6562 2.40625C10.8438 1.96875 10.6875 1.46875 10.3125 1.21875C9.9375 0.9375 9.4375 0.96875 9.0625 1.25L1.0625 8.25C0.75 8.53125 0.65625 8.96875 0.8125 9.375C0.9375 9.75 1.3125 10.0312 1.75 10.0312H5.21875L2.8125 15.625C2.625 16.0625 2.78125 16.5625 3.15625 16.8125C3.3125 16.9375 3.53125 17 3.75 17C3.96875 17 4.21875 16.9375 4.40625 16.7812L12.4062 9.78125Z"
        fill={props.fill || 'current'}
      />
      <defs>
        <linearGradient id="paint0_linear_1062_464" x1="6.75" y1="17" x2="6.75" y2="1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF512F" />
          <stop offset="1" stopColor="#DD2476" />
        </linearGradient>
      </defs>
    </svg>
  );
}
