import React from 'react';
import { ColorScheme } from '../index';

export interface IThemeContext {
  colorScheme: ColorScheme;
  theme: INovuTheme;
}

export interface INovuTheme {
  layoutWrap: {
    colors: {
      main: string;
      fontColor: string;
      secondaryFontColor: string;
    };
  };
  layout: { background: string; boxShadow: string };
  header: { background: string; color: string };
  popover: { background: string };
  fontFamily: string;
  notificationListItem: {
    seen: { background: string; fontColor: string };
    unseen: { background: string; boxShadow: string };
  };
  footer: { logoTextColor: string; textColor: string };
  mainColor: string;
  bellGradientDot: { color: { stopColor: string; stopColorOffset: string; color: string } };
}

/*
 * const defaultNovuThemeValues: INovuTheme = {
 *   background: null,
 *   boxShadow: null,
 *   fontColor: null,
 *   secondaryFontColor: null,
 *   fontFamily: 'Lato',
 *   unseenNotificationBackground: null,
 *   unseenNotificationBoxShadow: null,
 *   seenNotificationBackground: null,
 *   seenNotificationFontColor: null,
 *   footerLogoTextColor: null,
 *   footerTextColor: null,
 *   mainColor: colors.vertical,
 *   gradientDotFillColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
 * };
 */

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
  theme: null,
});
