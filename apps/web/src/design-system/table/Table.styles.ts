import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

export default createStyles((theme: MantineTheme, { withSelection }: { withSelection: boolean }, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const hover = { ref: getRef('hover') };

  return {
    hover,
    tableRow: {
      td: {
        textOverflow: 'ellipsis',
      },
    },
    root: {
      borderCollapse: 'collapse',
      borderSpacing: '0px 20px',
      'tr td:first-of-type': {
        paddingLeft: withSelection ? 10 : 30,
        paddingRight: withSelection ? 10 : 30,
      },
      'tr th:first-of-type': {
        paddingLeft: withSelection ? 10 : 30,
        paddingRight: withSelection ? 10 : 30,
      },
      'tr td:last-child': {
        paddingRight: 30,
      },
      'tr th:last-child': {
        paddingRight: 30,
      },
      '& thead tr': {
        borderBottom: `1px solid ${dark ? colors.B30 : colors.B98}`,
      },
      '& thead tr th': {
        fontWeight: 400,
        height: '17px',
        color: dark ? colors.B40 : colors.B70,
        borderBottom: 'none',
        borderSpacing: '0px',
        paddingBottom: '15px',
      },
      '& tbody tr td': {
        maxWidth: '100px',
        color: dark ? colors.white : colors.B40,
        borderBottomColor: dark ? colors.BGDark : colors.BGLight,
        height: '80px',
      },
      '& tbody tr[data-disabled="true"]:hover': {
        cursor: 'default',
      },
      '& tbody tr[data-disabled="false"]:hover': {
        cursor: 'pointer',
      },
      '& tbody tr:last-of-type td': {
        borderBottom: `1px solid ${dark ? colors.B20 : colors.B98}`,
      },
      ['&[data-hover]']: {
        '& tbody tr:hover': {
          backgroundColor: dark ? colors.B20 : colors.B98,
        },
        [`&.${hover.ref} tbody tr:hover`]: {
          backgroundColor: dark ? colors.B20 : colors.B98,
        },
      },
    },
  };
});
