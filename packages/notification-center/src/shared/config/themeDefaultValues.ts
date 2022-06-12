import { colors } from './colors';
import { shadows } from './shadows';
import { INovuTheme } from '../../store/novu-theme.context';

const defaultTheme = {
  fontFamily: 'Lato',
};

export const defaultLightTheme: INovuTheme = {
  background: colors.white,
  boxShadow: shadows.medium,
  fontColor: colors.B40,
  secondaryFontColor: colors.B80,
  unseenNotificationBackground: colors.white,
  unseenNotificationBoxShadow: shadows.medium,
  seenNotificationBackground: colors.B98,
  seenNotificationFontColor: colors.B60,
  footerLogoTextColor: 'black',
  footerTextColor: colors.B70,
  mainColor: colors.vertical,
  gradientDotFillColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  ...defaultTheme,
};

export const defaultDarkTheme: INovuTheme = {
  background: colors.B15,
  boxShadow: shadows.dark,
  fontColor: colors.white,
  secondaryFontColor: colors.B40,
  unseenNotificationBackground: colors.B20,
  unseenNotificationBoxShadow: shadows.dark,
  seenNotificationBackground: colors.B17,
  seenNotificationFontColor: colors.B60,
  footerLogoTextColor: colors.white,
  footerTextColor: colors.B40,
  mainColor: colors.vertical,
  gradientDotFillColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  ...defaultTheme,
};
