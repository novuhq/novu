import { JSX } from 'solid-js';

export const ArrowDropDown = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path fill="currentColor" d="M5.833 8.333L10 12.5l4.166-4.167H5.833z"></path>
    </svg>
  );
};
