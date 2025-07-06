import React from 'react';

export const LayoutIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 14" fill="none" {...props}>
      <path
        fill="currentColor"
        d="M1.25 13.75A.75.75 0 0 1 .5 13V1a.75.75 0 0 1 .75-.75h13.5a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-.75.75H1.25Zm3-8.25H2v6.75h2.25V5.5Zm9.75 0H5.75v6.75H14V5.5Zm0-3.75H2V4h12V1.75Z"
      />
    </svg>
  );
};
