import { useId } from 'react';

export const ClickupIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const a = `${id}-a`;
  const b = `${id}-b`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M2.5 14.6943L5.26796 12.6328C6.73855 14.4988 8.30098 15.3588 10.0401 15.3588C11.7699 15.3588 13.2882 14.5089 14.6925 12.6577L17.5 14.6694C15.4737 17.3389 12.9557 18.7494 10.0401 18.7494C7.13381 18.7494 4.59137 17.348 2.5 14.6943Z"
        fill={`url(#${a})`}
      />
      <path
        d="M10.0303 5.73459L5.10355 9.86204L2.82617 7.29425L10.0408 1.25L17.1984 7.29877L14.9106 9.85752L10.0303 5.73459Z"
        fill={`url(#${b})`}
      />
      <defs>
        <linearGradient id={a} x1="2.5" y1="15.7" x2="17.5" y2="15.7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8930FD" />
          <stop offset="1" stopColor="#49CCF9" />
        </linearGradient>
        <linearGradient id={b} x1="2.82617" y1="5.55" x2="17.1984" y2="5.55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF02F0" />
          <stop offset="1" stopColor="#FFC800" />
        </linearGradient>
      </defs>
    </svg>
  );
};
