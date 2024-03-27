/* eslint-disable max-len */

import { useMantineTheme } from '@mantine/core';
import { colors } from '../../config';

export const ChevronRight = () => {
  const theme = useMantineTheme();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path
        d="M1.66016 1.28223C1.09766 0.719727 0.160156 1.12598 0.160156 1.87598L0.160156 10.1572C0.160156 10.9072 1.09766 11.3135 1.66016 10.751L5.91016 6.62598C6.09766 6.46973 6.16016 6.25098 6.16016 6.00098C6.16016 5.78223 6.09766 5.56348 5.91016 5.40723L1.66016 1.28223Z"
        fill={theme.colorScheme === 'light' ? colors.B60 : 'white'}
      />
    </svg>
  );
};
