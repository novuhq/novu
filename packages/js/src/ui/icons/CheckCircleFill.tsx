import { JSX } from 'solid-js';

export const CheckCircleFill = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="8" cy="8" r="6" fill="#1FC16B" />
      <path
        d="M5.5 8L7.25 9.75L10.5 6.5"
        stroke="white"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
