/* eslint-disable max-len */

import { useMantineTheme } from '@mantine/core';
import { colors } from '../../config';

export const ChevronLeft = () => {
  const theme = useMantineTheme();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path
        d="M4.66016 10.7188C5.22266 11.2812 6.16016 10.875 6.16016 10.125V1.84375C6.16016 1.09375 5.22266 0.6875 4.66016 1.25L0.410156 5.375C0.222656 5.53125 0.160156 5.75 0.160156 6C0.160156 6.21875 0.222656 6.4375 0.410156 6.59375L4.66016 10.7188Z"
        fill={theme.colorScheme === 'light' ? colors.B60 : 'white'}
      />
    </svg>
  );
};
