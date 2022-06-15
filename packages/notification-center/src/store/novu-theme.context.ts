import React from 'react';
import { ColorScheme } from '../index';
import {
  IThemeBellGradientDot,
  IThemeFooter,
  IThemeGeneral,
  IThemeHeader,
  IThemeLayout,
  IThemeNotificationListItem,
  IThemePopover,
} from '../shared/utils/themeMapper';
import { ICommonTheme } from './novu-theme-provider.context';

export interface IThemeContext {
  colorScheme: ColorScheme;
  theme: INovuTheme;
  common: ICommonTheme;
}

export interface INovuTheme {
  general?: IThemeGeneral;
  layout?: IThemeLayout;
  header?: IThemeHeader;
  popover?: IThemePopover;
  notificationListItem?: IThemeNotificationListItem;
  footer?: IThemeFooter;
  mainColor?: string;
  bellGradientDot?: IThemeBellGradientDot;
}

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
  theme: null,
  common: null,
});
