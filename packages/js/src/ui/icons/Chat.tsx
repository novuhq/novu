import { JSX } from 'solid-js';

export const Chat = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M12.5 3.333v5.834H4.31l-.975.975V3.333H12.5zm.834-1.666H2.5a.836.836 0 00-.833.833v11.667L5 10.833h8.334a.836.836 0 00.833-.833V2.5a.836.836 0 00-.833-.833zM17.5 5h-1.666v7.5H5v1.667c0 .458.375.833.834.833H15l3.334 3.333v-12.5A.836.836 0 0017.5 5z"
      ></path>
    </svg>
  );
};
