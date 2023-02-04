import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

export default createStyles<string, { disabled: boolean }>((theme, _params, getRef) => ({
  track: {
    '&::before': { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.blue[1] },
  },
  bar: {
    backgroundColor: colors.warning,
  },
  label: { fontSize: theme.fontSizes.sm },
  mark: {
    width: 6,
    height: 6,
    borderRadius: 6,
    transform: 'translateX(-3px) translateY(-2px)',
    borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.blue[1],
  },
  markFilled: { borderColor: theme.colors.blue[6] },
  markLabel: { fontSize: theme.fontSizes.xs, marginBottom: 5, marginTop: 0 },
  thumb: { height: 16, width: 16, backgroundColor: 'red', borderWidth: 1, boxShadow: theme.shadows.sm },
}));
