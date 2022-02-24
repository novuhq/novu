import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../config';

export default createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const hover = { ref: getRef('hover') };

  return {
    hover,
    root: {
      borderCollapse: 'collapse',
      borderSpacing: '0px 20px',
      '& thead tr th': {
        fontWeight: '400',
        height: '17px',
        color: dark ? colors.B40 : colors.B70,
        borderBottom: 'none',
        paddingLeft: '30px',
        borderSpacing: '0px',
        paddingBottom: '15px',
      },
      '& tbody tr td': {
        maxWidth: '100px',
        color: dark ? colors.white : colors.B40,
        borderBottomColor: dark ? colors.BGDark : colors.BGLight,
        height: '80px',
        paddingLeft: '30px',
      },
      '& tbody tr:last-of-type td': {
        borderBottom: `1px solid ${dark ? colors.B20 : colors.B98}`,
      },
      '& tbody tr:hover': {
        backgroundColor: dark ? colors.B20 : colors.B98,
      },
      [`&.${hover.ref} tbody tr:hover`]: {
        backgroundColor: dark ? colors.B20 : colors.B98,
      },
    },
  };
});
