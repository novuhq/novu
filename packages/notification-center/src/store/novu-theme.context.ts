import React from 'react';
import { ColorScheme } from '../index';

export interface IThemeContext {
  colorScheme: ColorScheme;
  theme: INovuTheme;
}

export interface INovuTheme {
  layout?: {
    background?: string;
    boxShadow?: string;
    wrapper?: {
      mainColor?: string;
      fontColor?: string;
      secondaryFontColor?: string;
    };
  };
  header?: { background?: string; color?: string; mainColor?: string };
  popover?: { background?: string };
  fontFamily?: string;
  notificationListItem?: {
    mainColor?: string;
    seen?: { background?: string; fontColor?: string };
    unseen?: { background?: string; boxShadow?: string };
  };
  footer?: { logoTextColor?: string; textColor?: string };
  mainColor?: string;
  bellGradientDot?: { color?: { stopColor?: string; stopColorOffset?: string; backgroundColor?: string } };
}

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
  theme: null,
});
