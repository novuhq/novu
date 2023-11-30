import React from 'react';
import { useMantineTheme } from '@mantine/core';

/* eslint-disable */
export function Filter(props: React.ComponentPropsWithoutRef<'svg'>) {
  const theme = useMantineTheme();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="14" viewBox="0 0 16 14" fill="none" {...props}>
      <path
        d="M0.572302 0.932728L0.572318 0.932736L0.574158 0.928835C0.698017 0.666102 0.959543 0.5 1.25002 0.5H14.75C15.0405 0.5 15.302 0.666102 15.4259 0.928835C15.5502 1.19251 15.5124 1.50201 15.3285 1.72733C15.3285 1.72738 15.3284 1.72743 15.3284 1.72748L9.61307 8.71147L9.50002 8.84962V9.02812V13C9.50002 13.19 9.39351 13.3622 9.22493 13.4457C9.05055 13.5321 8.85 13.5129 8.70068 13.4005L8.70002 13.4L6.70002 11.9L6.70003 11.9L6.69763 11.8982C6.57427 11.8068 6.50002 11.6603 6.50002 11.5V9.02812V8.8496L6.38695 8.71145L0.668828 1.72472C0.668738 1.72461 0.668649 1.7245 0.668559 1.72439C0.486242 1.50046 0.448639 1.18928 0.572302 0.932728Z"
        stroke={theme.colorScheme === 'light' ? 'black' : 'currentColor'}
      />
    </svg>
  );
}
