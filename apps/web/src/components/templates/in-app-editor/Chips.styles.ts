import { createStyles, MantineTheme } from '@mantine/core';
import { colors } from '../../../design-system';
import { getOutlineStyles } from '../../../design-system/button/Button.styles';

export default createStyles((theme, _params, getRef) => {
  const disabled = getRef('disabled');
  const checked = getRef('checked');

  return {
    label: {
      padding: '0 15px',
    },
    filled: {
      backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
      '&:hover': {
        backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.white,
      },
    },
    iconWrapper: {
      display: 'none',
      [`& .${disabled}`]: {
        display: 'block',
      },
    },
    checked: {
      ...getOutlineStyles(theme),
      ref: checked,
      color: theme.colorScheme === 'dark' ? theme.white : colors.B40,
      [`& .${disabled}`]: {
        color: 'blue !important',
      },
      [`& .${getRef('iconWrapper')}`]: {
        display: 'none',
      },
    },
    disabled: {
      ref: disabled,
      [`& .${getRef('iconWrapper')}`]: {
        display: 'inline-block',
      },
      [`& .${checked}`]: {
        color: 'blue',
      },
    },
  };
});
