import { JSX } from 'solid-js';

export const MarkAsUnread = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6.8 1.49902H1.5C0.947715 1.49902 0.5 1.94674 0.5 2.49902V9.49902C0.5 10.0513 0.947715 10.499 1.5 10.499H8.5C9.05228 10.499 9.5 10.0513 9.5 9.49902V4.19902"
        stroke="currentColor"
        stroke-miterlimit="1"
        stroke-linecap="round"
      />
      <circle cx="9.25" cy="1.74902" r="1.25" fill="currentColor" />
    </svg>
  );
};
