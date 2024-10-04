import { JSX } from 'solid-js';

/* eslint-disable max-len */
export const Archive = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M16.25 15V6.875L15 4.375H5L3.75 6.877V15c0 .345.28.625.625.625h11.25c.345 0 .625-.28.625-.625zM5 8.125h10v6.25H5v-6.25zm.772-2.5h8.455l.625 1.25H5.148l.625-1.25zm6.103 3.75h-3.75v1.25h3.75v-1.25z"
      ></path>
    </svg>
  );
};
