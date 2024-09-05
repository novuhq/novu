import { JSX } from 'solid-js';

export const Inbox = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M15.833 2.5H4.158c-.925 0-1.65.742-1.65 1.667L2.5 15.833A1.66 1.66 0 004.158 17.5h11.675c.917 0 1.667-.75 1.667-1.667V4.167A1.667 1.667 0 0015.833 2.5zm0 10H12.5c0 1.383-1.125 2.5-2.5 2.5a2.502 2.502 0 01-2.5-2.5H4.158V4.167h11.675V12.5z"
      ></path>
    </svg>
  );
};
