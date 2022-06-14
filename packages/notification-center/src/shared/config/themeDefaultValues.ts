import { colors } from './colors';
import { shadows } from './shadows';
import { INovuTheme } from '../../store/novu-theme.context';

const defaultTheme = {
  fontFamily: 'Lato',
};

export const defaultLightTheme: INovuTheme = {
  layout: {
    background: colors.white,
    boxShadow: shadows.medium,
    wrapper: {
      mainColor: colors.vertical,
      fontColor: colors.B60,
      secondaryFontColor: colors.B80,
    },
  },
  header: { background: colors.white, color: colors.white, mainColor: colors.vertical },
  popover: { background: colors.white },
  notificationListItem: {
    mainColor: colors.vertical,
    seen: { background: colors.B98, fontColor: colors.B60 },
    unseen: { background: colors.white, boxShadow: shadows.medium },
  },
  footer: { logoTextColor: 'black', textColor: colors.B70 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', backgroundColor: colors.white } },
  ...defaultTheme,
};

export const defaultDarkTheme: INovuTheme = {
  layout: {
    background: colors.B15,
    boxShadow: shadows.dark,
    wrapper: {
      mainColor: colors.vertical,
      fontColor: colors.white,
      secondaryFontColor: colors.B40,
    },
  },
  header: { background: colors.B15, color: colors.white, mainColor: colors.vertical },
  popover: { background: colors.B15 },
  notificationListItem: {
    mainColor: colors.vertical,
    seen: { background: colors.B17, fontColor: colors.white },
    unseen: { background: colors.B20, boxShadow: shadows.dark },
  },
  footer: { logoTextColor: colors.white, textColor: colors.B40 },
  mainColor: colors.vertical,
  bellGradientDot: { color: { stopColor: '#FF512F', stopColorOffset: '#DD2476', backgroundColor: colors.B15 } },
  ...defaultTheme,
};
