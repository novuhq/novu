import { JSX } from 'solid-js';

export function BellPlus(props?: JSX.HTMLAttributes<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.1"
        d="M7.206 12.5c.08.152.196.278.336.366a.86.86 0 0 0 .916 0 .96.96 0 0 0 .336-.366m.58-6.5h2.75M10.75 4.5v3m.918 1.732q.156.227.338.431.091.11.113.257a.54.54 0 0 1-.033.282.5.5 0 0 1-.17.217.43.43 0 0 1-.25.08H4.334a.43.43 0 0 1-.25-.08.5.5 0 0 1-.17-.217.54.54 0 0 1 .081-.539C4.604 8.978 5.25 8.25 5.25 6c0-.515.121-1.02.352-1.47.231-.448.564-.824.967-1.092a2.6 2.6 0 0 1 1.333-.436c.471-.018.94.096 1.358.332"
      />
    </svg>
  );
}
