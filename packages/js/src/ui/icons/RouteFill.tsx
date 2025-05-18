import { JSX } from 'solid-js';

export const RouteFill = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" {...props}>
      <path
        fill="currentColor"
        d="M2.8 8.575V5.162a2.362 2.362 0 1 1 4.725 0v3.675a1.313 1.313 0 1 0 2.625 0V5.335a1.575 1.575 0 1 1 1.05 0v3.502a2.362 2.362 0 1 1-4.725 0V5.162a1.312 1.312 0 1 0-2.625 0v3.413h1.575l-2.1 2.625-2.1-2.625H2.8Z"
      />
      <path
        fill="url(#a)"
        d="M2.8 8.575V5.162a2.362 2.362 0 1 1 4.725 0v3.675a1.313 1.313 0 1 0 2.625 0V5.335a1.575 1.575 0 1 1 1.05 0v3.502a2.362 2.362 0 1 1-4.725 0V5.162a1.312 1.312 0 1 0-2.625 0v3.413h1.575l-2.1 2.625-2.1-2.625H2.8Z"
      />
      <defs>
        <linearGradient id="a" x1="1.225" x2="12.251" y1="6.722" y2="6.779" gradientUnits="userSpaceOnUse">
          <stop stop-color="currentColor" />
          <stop offset="1" stop-color="currentColor" />
        </linearGradient>
      </defs>
    </svg>
  );
};
