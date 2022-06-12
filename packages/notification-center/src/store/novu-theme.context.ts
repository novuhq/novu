import React from 'react';
import { ColorScheme } from '../index';
import { colors } from '../shared/config/colors';

export interface IThemeContext {
  colorScheme: ColorScheme;
  theme: INovuTheme;
}

export interface INovuTheme {
  background: string;
  boxShadow: string;
  fontColor: string;
  secondaryFontColor: string;
  fontFamily: string;
  unseenNotificationBackground: string;
  unseenNotificationBoxShadow: string;
  seenNotificationBackground: string;
  seenNotificationFontColor: string;
  footerLogoTextColor: string;
  footerTextColor: string;
  mainColor: string;
  gradientDotFillColor: { stopColor: string; stopColorOffset: string };
}

const defaultNovuThemeValues: INovuTheme = {
  background: null,
  boxShadow: null,
  fontColor: null,
  secondaryFontColor: null,
  fontFamily: 'Lato',
  unseenNotificationBackground: null,
  unseenNotificationBoxShadow: null,
  seenNotificationBackground: null,
  seenNotificationFontColor: null,
  footerLogoTextColor: null,
  footerTextColor: null,
  mainColor: colors.vertical,
  gradientDotFillColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
};

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
  theme: defaultNovuThemeValues,
});
