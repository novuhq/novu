import { JSX } from 'solid-js';

export function EmptyIcon(props?: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M35.2 21.62L32.38 18.8L39.5 11.7L42.32 14.52C42.1 14.58 35.2 21.62 35.2 21.62ZM26 6H22V16H26V6ZM12.8 21.62L15.62 18.8L8.52 11.68L5.68 14.52C5.9 14.58 12.8 21.62 12.8 21.62ZM40 28H33.16C31.62 31.52 28.08 34 24 34C19.92 34 16.38 31.52 14.84 28H8V38H40V28ZM40 24C42.2 24 44 25.8 44 28V38C44 40.2 42.2 42 40 42H8C5.8 42 4 40.2 4 38V28C4 25.8 5.8 24 8 24H18C18 27.32 20.68 30 24 30C27.32 30 30 27.32 30 24H40Z"
      />
    </svg>
  );
}
