import React from 'react';

export function RouteFill(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M4 12.25V7.375a3.375 3.375 0 016.75 0v5.25a1.875 1.875 0 103.75 0V7.623a2.25 2.25 0 111.5 0v5.002a3.375 3.375 0 01-6.75 0v-5.25a1.875 1.875 0 10-3.75 0v4.875h2.25l-3 3.75-3-3.75H4z"
      ></path>
    </svg>
  );
}
