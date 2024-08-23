import { JSX } from 'solid-js';

export const Dots = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M5 8.333c-.917 0-1.667.75-1.667 1.667s.75 1.667 1.667 1.667c.916 0 1.666-.75 1.666-1.667S5.916 8.333 5 8.333zm10 0c-.917 0-1.667.75-1.667 1.667s.75 1.667 1.667 1.667c.916 0 1.666-.75 1.666-1.667S15.916 8.333 15 8.333zm-5 0c-.917 0-1.667.75-1.667 1.667s.75 1.667 1.667 1.667c.916 0 1.666-.75 1.666-1.667S10.916 8.333 10 8.333z"
      ></path>
    </svg>
  );
};
