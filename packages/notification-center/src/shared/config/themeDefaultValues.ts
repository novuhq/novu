import { colors } from './colors';
import { shadows } from './shadows';
import { INovuTheme } from '../../store/novu-theme.context';
import { ICommonTheme } from '../../store/novu-theme-provider.context';

export const defaultLightTheme: INovuTheme = {
  layout: {
    background: colors.white,
    boxShadow: shadows.medium,
    wrapper: {
      secondaryFontColor: colors.B80,
    },
  },
  header: {
    fontColor: colors.B60,
    badgeColor: colors.vertical,
    badgeTextColor: colors.white,
  },
  popover: { arrowColor: colors.white },
  notificationListItem: {
    seen: { background: colors.B98, fontColor: colors.B60, timeMarkFontColor: colors.B80 },
    unseen: {
      background: colors.white,
      fontColor: colors.B60,
      boxShadow: shadows.medium,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
  },
  footer: { logoTextColor: 'black', logoPrefixFontColor: colors.B70 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', borderColor: colors.white } },
};

export const defaultDarkTheme: INovuTheme = {
  layout: {
    background: colors.B15,
    boxShadow: shadows.dark,
    wrapper: {
      secondaryFontColor: colors.B40,
    },
  },
  header: {
    fontColor: colors.white,
    badgeColor: colors.vertical,
    badgeTextColor: colors.white,
  },
  popover: { arrowColor: colors.B15 },
  notificationListItem: {
    seen: { background: colors.B17, fontColor: colors.white, timeMarkFontColor: colors.B40 },
    unseen: {
      background: colors.B20,
      fontColor: colors.white,
      boxShadow: shadows.dark,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
  },
  footer: { logoTextColor: colors.white, logoPrefixFontColor: colors.B40 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', borderColor: colors.B15 } },
};

export const defaultCommonTheme: ICommonTheme = {
  fontFamily: 'Montserrat',
};
