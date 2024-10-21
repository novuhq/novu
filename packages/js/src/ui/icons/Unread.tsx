import { JSX } from 'solid-js';

export const Unread = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M10 15v1.25H4.996a.625.625 0 01-.621-.62V4.37c0-.342.28-.62.624-.62H12.5l3.125 3.125v4.375h-1.25V7.5h-2.5V5h-6.25v10H10zm1.54-.335l2.21 2.21 3.094-3.093-.884-.884-2.21 2.21-1.326-1.326-.884.883z"
      ></path>
    </svg>
  );
};
