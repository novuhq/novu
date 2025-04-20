import { JSX } from 'solid-js';

export const MarkAsRead = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <g fill="currentColor" clip-path="url(#a)">
        <path d="M12 13H4a.5.5 0 0 1-.5-.5v-9A.5.5 0 0 1 4 3h5.25a.5.5 0 0 1 0 1H4.5v8h7V7.5a.5.5 0 1 1 1 0v5a.5.5 0 0 1-.5.5Z" />
        <path d="M10.5 11.25h-5a.5.5 0 1 1 0-1h5a.5.5 0 1 1 0 1ZM7.75 9.5a.5.5 0 0 1-.355-.145l-1.5-1.5a.502.502 0 0 1 .71-.71L7.73 8.27l3.645-4.1a.5.5 0 1 1 .75.66l-4 4.5a.5.5 0 0 1-.36.17H7.75Z" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M3 3h10v10H3z" />
        </clipPath>
      </defs>
    </svg>
  );
};
