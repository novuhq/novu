import { JSX } from 'solid-js';

export const MarkAsUnread = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M6.8 1.5H1.5C0.947715 1.5 0.5 1.94772 0.5 2.5V9.5C0.5 10.0523 0.947715 10.5 1.5 10.5H8.5C9.05228 10.5 9.5 10.0523 9.5 9.5V4.2"
        stroke="currentColor"
        stroke-miterlimit="1"
        stroke-linecap="round"
      />
      <circle cx="9.25" cy="1.75" r="1.25" fill="currentColor" />
    </svg>
  );
};
