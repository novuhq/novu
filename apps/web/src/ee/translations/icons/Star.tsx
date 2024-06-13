import React from 'react';
import { useMantineColorScheme } from '@mantine/core';

export const Star = (props) => {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="15" viewBox="0 0 16 15" fill="none" {...props}>
      <path
        d="M6.06364 10.5696L5.51971 12.8662L7.54801 11.6595L9.99922 10.2011L12.4504 11.6595L14.4787 12.8662L13.9348 10.5696L13.2882 7.8395L15.4479 5.99859L17.2759 4.44047L14.8823 4.241L12.0315 4.00344L10.9184 1.40613L10.001 -0.73428L9.08064 1.4048L7.96695 3.9931L5.11259 4.24131L2.73178 4.44834L4.55052 5.99859L6.71024 7.8395L6.06364 10.5696Z"
        fill={isDark ? 'white' : '#525266'}
        stroke={isDark ? '#23232B' : 'white'}
        strokeWidth="2"
      />
    </svg>
  );
};
