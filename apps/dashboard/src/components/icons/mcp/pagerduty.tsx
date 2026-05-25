import { useId } from 'react';

export const PagerdutyIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  const id = useId();
  const clip = `${id}-clip`;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" {...props}>
      <g clipPath={`url(#${clip})`}>
        <path d="M19 1H1V19H19V1Z" fill="#048A24" />
        <path d="M8.71333 12.7266H7V15.8332H8.71333V12.7266Z" fill="white" />
        <path
          d="M13.4333 4.7413C12.52 4.25464 11.88 4.16797 10.38 4.16797H7V11.2413H10.3667C11.7 11.2413 12.7 11.1613 13.58 10.5746C14.54 9.9413 15.04 8.8813 15.04 7.65464C15.04 6.42797 14.4267 5.27464 13.4333 4.73464V4.7413ZM10.76 9.7613H8.71333V5.68797L10.6467 5.67464C12.4067 5.6613 13.2867 6.27464 13.2867 7.6813C13.2867 9.08797 12.1933 9.76797 10.76 9.76797V9.7613Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id={clip}>
          <rect x="1" y="1" width="18" height="18" rx="2" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
