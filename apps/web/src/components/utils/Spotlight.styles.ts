import { createStyles, MantineTheme } from '@mantine/core';
import { colors, shadows } from '@novu/design-system';

export default createStyles((theme: MantineTheme) => {
  return {
    spotlight: {
      backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
      boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
    },
    searchInput: {
      backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
    },
  };
});
