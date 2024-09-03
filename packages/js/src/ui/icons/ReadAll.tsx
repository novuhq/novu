import { JSX } from 'solid-js';

export const ReadAll = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M15.833 2.5H4.167C3.25 2.5 2.5 3.25 2.5 4.167v11.666c0 .917.75 1.667 1.667 1.667h11.666c.917 0 1.667-.75 1.667-1.667V4.167c0-.917-.75-1.667-1.667-1.667zm0 13.333H4.167V4.167h11.666v11.666zM14.992 7.5l-1.175-1.183-5.492 5.491-2.15-2.141-1.183 1.175 3.333 3.325L14.992 7.5z"
      ></path>
    </svg>
  );
};
