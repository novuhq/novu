import { JSX } from 'solid-js';

export const Email = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M16.667 3.333H3.334c-.917 0-1.659.75-1.659 1.667l-.008 10c0 .917.75 1.667 1.667 1.667h13.333c.917 0 1.667-.75 1.667-1.667V5c0-.917-.75-1.667-1.667-1.667zm0 11.667H3.334V6.667L10 10.833l6.667-4.166V15zM10 9.167L3.334 5h13.333L10 9.167z"
      ></path>
    </svg>
  );
};
