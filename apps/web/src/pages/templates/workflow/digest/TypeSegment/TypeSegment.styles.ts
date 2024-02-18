import { createStyles, MantineSize, MantineTheme } from '@mantine/core';
import { colors, shadows, getGradient } from '@novu/design-system';

export default createStyles<string, { size: MantineSize }>((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';
  const label = getRef('label');

  return {
    root: {
      width: '100%',
      maxWidth: '300px',
      background: dark ? colors.B20 : colors.B98,
      padding: '5px',
      boxShadow: shadows.dark,
    },
    active: {
      background: `${dark ? getGradient(colors.BGDark) : getGradient(colors.white)} padding-box, ${
        colors.horizontal
      } border-box`,
      border: '2px solid transparent',
    },
    label: {
      ref: label,
      fontSize: '14px',
      fontWeight: 700,
      padding: `12px ${_params.size === 'md' ? '18' : '14'}px`,
      color: colors.B60,
    },
    labelActive: {
      color: dark ? theme.white : theme.colors.gray[8],
    },
  };
});
