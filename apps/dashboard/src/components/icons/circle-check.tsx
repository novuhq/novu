import type { HTMLAttributes } from 'react';

export const CircleCheck = (props: HTMLAttributes<HTMLOrSVGElement> & { color?: string }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 17 16" fill="none" {...props}>
      <path
        d="M6.50004 7.99999L7.83337 9.33333L10.5 6.66666M15.1667 7.99999C15.1667 11.6819 12.1819 14.6667 8.50004 14.6667C4.81814 14.6667 1.83337 11.6819 1.83337 7.99999C1.83337 4.3181 4.81814 1.33333 8.50004 1.33333C12.1819 1.33333 15.1667 4.3181 15.1667 7.99999Z"
        stroke={props.color ?? '#1FC16B'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
