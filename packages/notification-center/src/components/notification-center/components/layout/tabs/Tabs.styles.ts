import { createStyles, MantineTheme } from '@mantine/core';
import { INovuTheme } from '../../../../../store/novu-theme.context';
import { ICommonTheme } from '../../../../../store/novu-theme-provider.context';
import { colors } from '../../../../../shared/config/colors';

export default createStyles(
  (theme: MantineTheme, { novuTheme, common }: { novuTheme: INovuTheme; common: ICommonTheme }, getRef) => {
    const tabLabel = getRef('tabLabel');
    const tabIcon = getRef('tabIcon');

    return {
      tabsList: {
        gap: '30px',
        padding: '15px',
      },

      tabControl: {
        marginBottom: '0',
        padding: '0px',
        height: '30px',
      },

      tabActive: {
        width: 'auto',
        [`& .${tabLabel}`]: {
          color: novuTheme.header?.fontColor,

          '&::after': {
            content: '""',
            display: 'block',
            height: '2px',
            marginTop: '10px',
            background: novuTheme.header?.badgeColor,
            borderRadius: '10px',
          },
        },

        [`& .${tabIcon}`]: {
          color: 'red',
          background: novuTheme.header?.badgeColor,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
      },

      tabInner: {
        display: 'block',
        cursor: 'pointer',

        '&:hover': {
          [`& .${tabIcon}`]: {
            color: novuTheme.header?.fontColor,
          },

          [`& .${tabLabel}`]: {
            color: novuTheme.header?.fontColor,
          },
        },
      },

      tabLabel: {
        ref: tabLabel,
        fontFamily: common.fontFamily,
        fontSize: '14px',
        fontWeight: 700,
        color: colors.B60,
        textAlign: 'left',
      },

      tabIcon: {
        ref: tabIcon,

        display: 'block',
        fontSize: '26px',
        fontWeight: 700,
        marginBottom: '5px',
        color: colors.B60,
        textAlign: 'left',
      },
    };
  }
);
