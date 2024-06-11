/* eslint-disable max-len */
import React from 'react';

export const TerminalIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" {...props}>
      <path
        fill="currentColor"
        d="M2.8 12.8c-.33 0-.613-.118-.848-.353A1.156 1.156 0 011.6 11.6V4.395c0-.33.117-.612.352-.845A1.16 1.16 0 012.8 3.2h10.4c.33 0 .612.118.847.353s.353.517.353.848v7.204c0 .33-.118.612-.353.845a1.16 1.16 0 01-.847.35H2.8zm0-1.2h10.4v-6H2.8v6zm2.2-.8l-.85-.85L5.5 8.6 4.15 7.25 5 6.4l2.2 2.2L5 10.8zm3 0V9.6h4v1.2H8z"
      ></path>
    </svg>
  );
};
