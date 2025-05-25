import { JSX } from 'solid-js';

export const Info = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10Zm0-1a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm.5-4.75V9.5H9v1H7v-1h.5V8.25H7v-1h1.5ZM8.75 6a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
};
