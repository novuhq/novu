import React from 'react';

export function InboxEllipsis(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20" {...props}>
      <path
        fill="currentColor"
        d="M5 8.333c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666s1.667-.75 1.667-1.666c0-.917-.75-1.667-1.667-1.667m10 0c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666s1.667-.75 1.667-1.666c0-.917-.75-1.667-1.667-1.667m-5 0c-.917 0-1.667.75-1.667 1.667 0 .916.75 1.666 1.667 1.666s1.667-.75 1.667-1.666c0-.917-.75-1.667-1.667-1.667"
      ></path>
    </svg>
  );
}
