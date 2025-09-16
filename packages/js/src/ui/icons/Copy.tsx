import { JSX } from 'solid-js';

export const Copy = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 12 12" {...props}>
      <path
        fill="currentColor"
        d="M3.75 3.3V1.95a.45.45 0 0 1 .45-.45h5.4a.45.45 0 0 1 .45.45v6.3a.45.45 0 0 1-.45.45H8.25v1.35c0 .248-.203.45-.453.45H2.403a.449.449 0 0 1-.453-.45l.001-6.3c0-.248.203-.45.453-.45H3.75Zm-.899.9L2.85 9.6h4.5V4.2H2.851Zm1.799-.9h3.6v4.5h.9V2.4h-4.5v.9Z"
      />
    </svg>
  );
};
