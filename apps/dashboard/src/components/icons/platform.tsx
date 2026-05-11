import { useId } from 'react';

export function PlatformIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  const id = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" {...props}>
      <g clip-path={`url(#${id})`}>
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M8.333 18.25v-6.584m0 0L1.749 7.583m6.584 4.083 9.916-5.75m-6.583 10.583V9.75m3.333 4.833v-6.75m3.334-1.416c0-.5-.334-1-.667-1.25l-5.25-3.25a1.43 1.43 0 0 0-1.417 0l-8.583 5c-.417.166-.75.666-.75 1.166v5.5c0 .417.333 1 .667 1.25l5.25 3.25a1.43 1.43 0 0 0 1.416 0l8.584-5c.416-.25.75-.833.75-1.25z"
        />
      </g>
      <defs>
        <clipPath id={id}>
          <path fill="#fff" d="M0 0h20v20H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
