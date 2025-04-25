import { JSX } from 'solid-js';

export const Snooze = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6 2.99902V5.99902H8.25M11 5.99902C11 8.76045 8.76142 10.999 6 10.999C3.23858 10.999 1 8.76045 1 5.99902C1 3.2376 3.23858 0.999023 6 0.999023C8.76142 0.999023 11 3.2376 11 5.99902Z"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
