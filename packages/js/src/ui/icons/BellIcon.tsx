import { JSX } from 'solid-js';

export function BellIcon(props?: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M10 18.333c.916 0 1.666-.75 1.666-1.666H8.333c0 .916.75 1.666 1.667 1.666zm5-5V9.167c0-2.559-1.359-4.7-3.75-5.267v-.567c0-.691-.559-1.25-1.25-1.25-.692 0-1.25.559-1.25 1.25V3.9C6.366 4.467 5 6.6 5 9.167v4.166L3.333 15v.833h13.333V15L15 13.333zm-1.667.834H6.666v-5c0-2.067 1.259-3.75 3.334-3.75s3.333 1.683 3.333 3.75v5z"
      ></path>
    </svg>
  );
}
