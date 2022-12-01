import { useMantineTheme } from '@mantine/core';
import { colors } from '../../config';
/* eslint-disable */
export const ChevronUp = () => {
  const theme = useMantineTheme();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6" fill="none">
      <path
        d="M1.44141 4.5C0.878906 5.0625 1.28516 6 2.03516 6L10.3164 6C11.0664 6 11.4727 5.0625 10.9102 4.5L6.78516 0.25C6.62891 0.0625 6.41016 0 6.16016 0C5.94141 0 5.72266 0.0625 5.56641 0.25L1.44141 4.5Z"
        fill={theme.colorScheme === 'light' ? colors.B60 : 'white'}
      />
    </svg>
  );
};
