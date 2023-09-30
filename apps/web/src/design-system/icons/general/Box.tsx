import React from 'react';

export function Box(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        // eslint-disable-next-line max-len
        d="M17.5 13.3329V6.66626C17.4997 6.37399 17.4225 6.08693 17.2763 5.83389C17.13 5.58086 16.9198 5.37073 16.6667 5.22459L10.8333 1.89126C10.58 1.74498 10.2926 1.66797 10 1.66797C9.70744 1.66797 9.42003 1.74498 9.16667 1.89126L3.33333 5.22459C3.08022 5.37073 2.86998 5.58086 2.72372 5.83389C2.57745 6.08693 2.5003 6.37399 2.5 6.66626V13.3329C2.5003 13.6252 2.57745 13.9122 2.72372 14.1653C2.86998 14.4183 3.08022 14.6285 3.33333 14.7746L9.16667 18.1079C9.42003 18.2542 9.70744 18.3312 10 18.3312C10.2926 18.3312 10.58 18.2542 10.8333 18.1079L16.6667 14.7746C16.9198 14.6285 17.13 14.4183 17.2763 14.1653C17.4225 13.9122 17.4997 13.6252 17.5 13.3329Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.7251 5.7998L10.0001 10.0081L17.2751 5.7998"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 18.4V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
