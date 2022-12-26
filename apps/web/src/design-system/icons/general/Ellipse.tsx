import React from 'react';
/* eslint-disable */
export function Ellipse(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg width="30" height="30" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="11" cy="11.5" r="10" stroke="rgb(130, 130, 153)" strokeWidth="2" />
      <path
        d="M11 4.5C11.9193 4.5 12.8295 4.68106 13.6788 5.03284C14.5281 5.38463 15.2997 5.90024 15.9497 6.55025C16.5998 7.20026 17.1154 7.97194 17.4672 8.82122C17.8189 9.6705 18 10.5807 18 11.5C18 12.4193 17.8189 13.3295 17.4672 14.1788C17.1154 15.0281 16.5998 15.7997 15.9497 16.4497C15.2997 17.0998 14.5281 17.6154 13.6788 17.9672C12.8295 18.3189 11.9193 18.5 11 18.5L11 4.5Z"
        fill="rgb(130, 130, 153)"
      />
    </svg>
  );
}
