import { JSX } from 'solid-js';

export const Check = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path fill="currentColor" d="M7.5 13.475L4.025 10l-1.183 1.175L7.5 15.833l10-10-1.175-1.175L7.5 13.475z"></path>
    </svg>
  );
};
