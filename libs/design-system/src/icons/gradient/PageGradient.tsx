/* eslint-disable max-len */

export const PageGradient = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="49" height="48" fill="none" viewBox="0 0 49 48" {...props}>
      <path
        fill="url(#a)"
        d="M32.5 37c.55 0 1-.45 1-1V18h-5c-1.106 0-2-.894-2-2v-5h-10c-.55 0-1 .45-1 1v24c0 .55.45 1 1 1h16Zm-20-25c0-2.206 1.794-4 4-4h10.344c1.062 0 2.081.419 2.831 1.169l5.656 5.656a4.001 4.001 0 0 1 1.169 2.831V36c0 2.206-1.794 4-4 4h-16c-2.206 0-4-1.794-4-4V12Z"
      />
      <defs>
        <linearGradient id="a" x1="12.5" x2="36.5" y1="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DD2476" />
          <stop offset="1" stopColor="#FF512F" />
        </linearGradient>
      </defs>
    </svg>
  );
};
