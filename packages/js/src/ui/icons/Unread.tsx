import { JSX } from 'solid-js';

export const Unread = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M18.334 5.817v7.516c0 .917-.75 1.667-1.667 1.667H5l-3.333 3.333v-15c0-.916.75-1.666 1.667-1.666h8.416c-.05.266-.083.55-.083.833 0 .283.033.567.083.833H3.334v10h13.333v-6.75a4.127 4.127 0 001.667-.766zm-5-3.317c0 1.383 1.116 2.5 2.5 2.5 1.383 0 2.5-1.117 2.5-2.5S17.217 0 15.834 0a2.497 2.497 0 00-2.5 2.5z"
      ></path>
    </svg>
  );
};
