import { JSX } from 'solid-js';

export const Sms = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M16.667 1.667H3.334c-.917 0-1.667.75-1.667 1.666v15L5 15h11.667c.917 0 1.667-.75 1.667-1.667v-10c0-.916-.75-1.666-1.667-1.666zm0 11.666H4.309l-.975.975V3.333h13.333v10zM5.834 7.5H7.5v1.667H5.834V7.5zm6.666 0h1.667v1.667H12.5V7.5zm-3.333 0h1.667v1.667H9.167V7.5z"
      ></path>
    </svg>
  );
};
