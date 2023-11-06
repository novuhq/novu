import React from 'react';
/* eslint-disable */
export function PlusCircleOutlined({
  fillColor,
  ...props
}: React.ComponentPropsWithoutRef<'svg'> & { fillColor?: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="0.5" y="0.5" width="29" height="29" rx="14.5" fill={fillColor || 'transparent'} />
      <path
        d="M20.6875 14.75C20.6875 14.1484 20.1953 13.6562 19.5938 13.6562H16.0938V10.1562C16.0938 9.55469 15.6016 9.0625 15 9.0625C14.3711 9.0625 13.9062 9.55469 13.9062 10.1562V13.6562H10.4062C9.77734 13.6562 9.3125 14.1484 9.3125 14.75C9.3125 15.3789 9.77734 15.8438 10.4062 15.8438H13.9062V19.3438C13.9062 19.9727 14.3711 20.4375 15 20.4375C15.6016 20.4375 16.0938 19.9727 16.0938 19.3438V15.8438H19.5938C20.1953 15.8438 20.6875 15.3789 20.6875 14.75Z"
        fill="currentColor"
      />
      <rect x="0.5" y="0.5" width="29" height="29" rx="14.5" stroke="currentColor" />
    </svg>
  );
}
