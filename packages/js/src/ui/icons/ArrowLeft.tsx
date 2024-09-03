import { JSX } from 'solid-js';

export const ArrowLeft = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M10 16.667l1.175-1.175-4.65-4.659h10.142V9.167H6.525l4.659-4.65L10 3.333 3.334 10 10 16.667z"
      ></path>
    </svg>
  );
};
