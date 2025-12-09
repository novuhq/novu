import { type HTMLAttributes, useId } from 'react';

export const Bell = (props: HTMLAttributes<HTMLOrSVGElement>) => {
  const gradientId = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 12 14" {...props}>
      <path
        fill={`url(#${gradientId})`}
        d="M6 0c-.435 0-.786.391-.786.875V1.4C3.42 1.805 2.07 3.571 2.07 5.687v.515c0 1.285-.425 2.526-1.19 3.489l-.183.227a.957.957 0 0 0-.13.94c.126.315.408.517.717.517h9.429c.31 0 .589-.202.717-.517a.95.95 0 0 0-.13-.94l-.182-.227c-.766-.963-1.191-2.202-1.191-3.49v-.513c0-2.117-1.35-3.883-3.143-4.288V.875C6.785.391 6.434 0 6 0Zm1.112 13.489c.294-.329.459-.774.459-1.239H4.429c-.001.465.164.91.458 1.239.295.328.695.511 1.112.511.418 0 .818-.183 1.113-.511Z"
      />
      <defs>
        <linearGradient id={gradientId} x1="6" y1="0" x2="6" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--bell-gradient-start, currentColor)" />
          <stop offset="1" stopColor="var(--bell-gradient-end, currentColor)" />
        </linearGradient>
      </defs>
    </svg>
  );
};
