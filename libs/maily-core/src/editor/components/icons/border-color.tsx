import { SVGProps } from 'react';

export function BorderColor(props: SVGProps<SVGSVGElement> & { topBarClassName?: string }) {
  const { topBarClassName, ...rest } = props;

  return (
    <svg width={11} height={12} viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M0 11H10.6667" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M0.666504 9V6.33333C0.666504 3.38781 3.05432 1 5.99984 1H10.6665"
        strokeWidth="1.5"
        className={topBarClassName}
      />
    </svg>
  );
}
