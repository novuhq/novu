import { JSX } from 'solid-js';

export const Push = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M15.833.833H7.5c-.917 0-1.667.75-1.667 1.667V5H7.5V3.333h8.333v13.334H7.5V15H5.833v2.5c0 .917.75 1.667 1.667 1.667h8.333c.917 0 1.667-.75 1.667-1.667v-15c0-.917-.75-1.667-1.667-1.667zM5.842 11.225L3.717 9.1l-1.059 1.058 3.175 3.175 5.992-5.991-1.058-1.059-4.925 4.942z"
      ></path>
    </svg>
  );
};
