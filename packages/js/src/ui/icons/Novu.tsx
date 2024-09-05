import { JSX } from 'solid-js';

export const Novu = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="12" fill="none" viewBox="0 0 13 12" {...props}>
      <path
        fill="currentColor"
        d="M9.787.98A5.972 5.972 0 006.5 0c-.668 0-1.31.11-1.911.31L9.187 4.94c.221.222.6.065.6-.248V.98z"
      ></path>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M2.879 1.216A5.99 5.99 0 00.5 6c0 1.134.315 2.195.862 3.1V7.309c0-1.966 2.379-2.946 3.764-1.552l4.995 5.027A5.99 5.99 0 0012.5 6a5.972 5.972 0 00-.862-3.1v1.791c0 1.966-2.379 2.946-3.764 1.552L2.879 1.216z"
      ></path>
      <path
        fill="currentColor"
        d="M8.411 11.69L3.813 7.06a.351.351 0 00-.6.248v3.711c.944.62 2.073.98 3.287.98.668 0 1.31-.11 1.911-.31z"
      ></path>
    </svg>
  );
};
