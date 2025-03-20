import { JSX } from 'solid-js';

export const UnreadRead = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="M4.012 4.348C4.062 4.145 4.266 4 4.5 4h7c.234 0 .437.145.488.348l1 4a.398.398 0 0 1 .012.096v3.112c0 .245-.224.444-.5.444h-9c-.276 0-.5-.199-.5-.444V8.444c0-.032.004-.064.012-.096l1-4Zm.89.54L4.122 8H6.5c0 .736.672 1.333 1.5 1.333S9.5 8.736 9.5 8h2.377l-.778-3.111H4.9Zm5.39 4c-.386.786-1.267 1.334-2.292 1.334S6.094 9.674 5.708 8.89H4v2.222h8V8.89h-1.708Z"
      />
    </svg>
  );
};
