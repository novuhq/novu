import React from 'react';
import { ColorScheme } from '../index';
import { ICommonTheme } from './novu-theme-provider.context';

export interface IThemeContext {
  colorScheme: ColorScheme;
  theme: INovuTheme;
  common: ICommonTheme;
}

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
  theme: null,
  common: null,
});

export interface INovuPopoverTheme extends INovuTheme {
  popover?: IThemePopover;
}

export interface INovuTheme {
  layout?: IThemeLayout;
  header?: IThemeHeader;
  popover?: IThemePopover;
  notificationItem?: IThemeNotificationListItem;
  footer?: IThemeFooter;
  loaderColor?: string;
  unseenBadge?: IThemeUnseenBadge;
}

export interface IThemeLayout {
  background?: string;
  boxShadow?: string;
  borderRadius?: string;
  wrapper?: {
    secondaryFontColor?: string;
  };
}

export interface IThemeHeader {
  badgeColor?: string;
  badgeTextColor?: string;
  fontColor?: string;
}

export interface IThemePopover {
  arrowColor?: string;
}

export interface IThemeNotificationListItem {
  seen?: {
    fontColor?: string;
    background?: string;
    timeMarkFontColor?: string;
  };
  unseen?: {
    fontColor?: string;
    background?: string;
    boxShadow?: string;
    notificationItemBeforeBrandColor?: string;
    timeMarkFontColor?: string;
  };
}

export interface IThemeFooter {
  logoTextColor?: string;
  logoPrefixFontColor?: string;
}

export interface IThemeUnseenBadge {
  color?: {
    fillColor?: string | ISvgStopColor;
    borderColor?: string;
  };
}

export interface ISvgStopColor {
  stopColor?: string;
  stopColorOffset?: string;
}

export interface IThemeGeneral {
  backgroundColor?: string;
  mainBrandColor?: string;
  boxShadowColor?: string;
  fontColor?: string;
}
