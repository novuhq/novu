import { JSX } from 'solid-js';

export const ArchiveRead = (props?: JSX.HTMLAttributes<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        // eslint-disable-next-line max-len
        d="M17.117 4.358l-1.159-1.4A1.21 1.21 0 0015 2.5H5c-.392 0-.733.175-.967.458l-1.15 1.4A1.632 1.632 0 002.5 5.417v10.416c0 .917.75 1.667 1.667 1.667h11.666c.917 0 1.667-.75 1.667-1.667V5.417c0-.4-.142-.775-.383-1.059zM10 14.583L5.417 10h2.916V8.333h3.334V10h2.916L10 14.583zM4.267 4.167l.675-.834h10l.783.834H4.267z"
      ></path>
    </svg>
  );
};
