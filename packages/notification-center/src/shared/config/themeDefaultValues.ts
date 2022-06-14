import { colors } from './colors';
import { shadows } from './shadows';
import { INovuTheme } from '../../store/novu-theme.context';

const defaultTheme = {
  fontFamily: 'Lato',
};

export const defaultLightTheme: INovuTheme = {
  layoutWrap: {
    colors: {
      main: colors.vertical,
      fontColor: colors.B60,
      secondaryFontColor: colors.B80,
    },
  },
  layout: { background: colors.white, boxShadow: shadows.medium },
  header: { background: colors.white, color: colors.white },
  popover: { background: colors.white },
  notificationListItem: {
    seen: { background: colors.B98, fontColor: colors.B60 },
    unseen: { background: colors.white, boxShadow: shadows.medium },
  },
  footer: { logoTextColor: 'black', textColor: colors.B70 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', color: colors.white } },
  ...defaultTheme,
};

export const defaultDarkTheme: INovuTheme = {
  layoutWrap: {
    colors: {
      main: colors.vertical,
      fontColor: colors.white,
      secondaryFontColor: colors.B40,
    },
  },
  layout: { background: colors.B15, boxShadow: shadows.dark },
  header: { background: colors.B15, color: colors.white },
  popover: { background: colors.B15 },
  notificationListItem: {
    seen: { background: colors.B17, fontColor: colors.white },
    unseen: { background: colors.B20, boxShadow: shadows.dark },
  },
  footer: { logoTextColor: colors.white, textColor: colors.B40 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', color: colors.B15 } },
  ...defaultTheme,
};
