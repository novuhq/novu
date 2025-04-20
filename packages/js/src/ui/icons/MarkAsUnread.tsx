import { JSX } from 'solid-js';

export const MarkAsUnread = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        stroke="currentColor"
        stroke-linecap="round"
        stroke-miterlimit="1"
        d="M9.8 3.5H4.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V6.2"
      />
      <circle cx="12.25" cy="3.75" r="1.25" fill="currentColor" />
    </svg>
  );
};
