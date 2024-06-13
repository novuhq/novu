import React from 'react';

export const ComputerIcon = (props: React.ComponentPropsWithoutRef<'svg'>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16" {...props}>
      <mask
        id="mask0_1816_67053"
        style={{ maskType: 'alpha' }}
        width="16"
        height="16"
        x="0"
        y="0"
        maskUnits="userSpaceOnUse"
      >
        <path fill="#D9D9D9" d="M0 0H16V16H0z"></path>
      </mask>
      <g mask="url(#mask0_1816_67053)">
        <path
          fill="currentColor"
          // eslint-disable-next-line max-len
          d="M5.6 13.583v-1.2h1.2v-1.2h-4c-.33 0-.613-.117-.848-.352a1.156 1.156 0 01-.352-.848v-6.4c0-.33.117-.612.352-.847s.518-.353.848-.353h10.4c.33 0 .612.118.847.353s.353.517.353.847v6.4c0 .33-.118.613-.353.848a1.156 1.156 0 01-.847.352h-4v1.2h1.2v1.2H5.6zm-2.8-3.6h10.4v-6.4H2.8v6.4z"
        ></path>
      </g>
    </svg>
  );
};
