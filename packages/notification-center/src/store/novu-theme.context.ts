import React from 'react';
import { IStyleButtons } from '@novu/shared';
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
  actionsMenu?: IThemeActionsMenu;
  notificationItem?: IThemeNotificationListItem;
  userPreferences?: IThemeUserPreferences;
  footer?: IThemeFooter;
  loaderColor?: string;
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
  tabBorderColor?: string;
  fontColor?: string;
  markAllAsReadButtonColor?: string;
}

export interface IThemePopover {
  arrowColor?: string;
  tabBorderColor?: string;
}

export interface IThemeActionsMenu {
  dotsButtonColor?: string;
  dropdownColor?: string;
  hoverColor?: string;
  fontColor?: string;
}

export interface IThemeNotificationListItem {
  read?: {
    fontColor?: string;
    background?: string;
    timeMarkFontColor?: string;
  };
  unread?: {
    fontColor?: string;
    background?: string;
    boxShadow?: string;
    notificationItemBeforeBrandColor?: string;
    timeMarkFontColor?: string;
  };
  buttons?: IStyleButtons;
}

export interface IThemeUserPreferences {
  settingsButtonColor?: string;
  accordion?: {
    background?: string;
    fontColor?: string;
    secondaryFontColor?: string;
    boxShadow?: string;
    arrowColor?: string;
    dividerColor?: string;
  };
  accordionItem: {
    fontColor?: { active?: string; inactive?: string };
    icon?: { active?: string; inactive?: string };
    switch?: {
      backgroundChecked?: string;
      backgroundUnchecked?: string;
    };
  };
}

export interface IThemeFooter {
  logoTextColor?: string;
  logoPrefixFontColor?: string;
}

export interface INotificationBellColors {
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
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
