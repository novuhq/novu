import { colors } from './colors';
import { shadows } from './shadows';
import { INotificationBellColors, INovuTheme } from '../../store/novu-theme.context';
import { ICommonTheme } from '../../store/novu-theme-provider.context';
import { darkButtonStyle, lightButtonStyle } from '@novu/shared';

export const defaultLightTheme: INovuTheme = {
  layout: {
    background: colors.white,
    boxShadow: shadows.medium,
    wrapper: {
      secondaryFontColor: colors.B80,
    },
  },
  header: {
    fontColor: colors.B40,
    badgeColor: colors.vertical,
    badgeTextColor: colors.white,
  },
  popover: { arrowColor: colors.white },
  notificationItem: {
    seen: { background: colors.B98, fontColor: colors.B60, timeMarkFontColor: colors.B80 },
    unseen: {
      background: colors.white,
      fontColor: colors.B40,
      boxShadow: shadows.medium,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
    buttons: lightButtonStyle,
  },
  preferenceItem: {
    accordion: {
      background: colors.white,
      fontColor: colors.B40,
      boxShadow: shadows.medium,
      icon: { active: colors.B40, inactive: colors.B60 },
    },
    switch: {
      background: colors.B60,
      backgroundChecked: colors.vertical,
      backgroundUnchecked: colors.B60,
    },
  },
  footer: { logoTextColor: 'black', logoPrefixFontColor: colors.B70 },
  loaderColor: colors.vertical,
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
  notificationItem: {
    seen: { background: colors.B17, fontColor: colors.white, timeMarkFontColor: colors.B40 },
    unseen: {
      background: colors.B20,
      fontColor: colors.white,
      boxShadow: shadows.dark,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
    buttons: darkButtonStyle,
  },
  preferenceItem: {
    accordion: {
      background: colors.B20,
      fontColor: colors.white,
      boxShadow: shadows.dark,
      icon: { active: colors.white, inactive: colors.B60 },
    },
    switch: {
      background: colors.B60,
      backgroundChecked: colors.vertical,
      backgroundUnchecked: colors.B60,
    },
  },
  footer: { logoTextColor: colors.white, logoPrefixFontColor: colors.B40 },
  loaderColor: colors.vertical,
};

export const defaultCommonTheme: ICommonTheme = {
  fontFamily: 'Lato',
};

export const defaultNotificationBellLightTheme: INotificationBellColors = {
  unseenBadgeColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  unseenBadgeBackgroundColor: colors.white,
};

export const defaultNotificationBellDarkTheme: INotificationBellColors = {
  unseenBadgeColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  unseenBadgeBackgroundColor: colors.B15,
};
