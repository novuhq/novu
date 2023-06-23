import { darkButtonStyle, lightButtonStyle } from '@novu/shared';

import { colors } from './colors';
import { shadows } from './shadows';
import { INotificationBellColors, INovuTheme } from '../../store/novu-theme.context';
import { ICommonTheme } from '../../store/novu-theme-provider.context';

const defaultLightTheme: INovuTheme = {
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
    markAllAsReadButtonColor: colors.B60,
  },
  popover: { arrowColor: colors.white },
  actionsMenu: {
    dropdownColor: colors.white,
    hoverColor: colors.B98,
    fontColor: colors.B40,
    dotsButtonColor: colors.B70,
  },
  notificationItem: {
    read: { background: colors.B98, fontColor: colors.B60, timeMarkFontColor: colors.B80 },
    unread: {
      background: colors.white,
      fontColor: colors.B40,
      boxShadow: shadows.medium,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
    buttons: lightButtonStyle,
  },
  userPreferences: {
    settingsButtonColor: colors.B70,
    accordion: {
      background: colors.white,
      fontColor: colors.B40,
      secondaryFontColor: colors.B60,
      boxShadow: shadows.medium,
      arrowColor: colors.B60,
      dividerColor: colors.BGLight,
    },
    accordionItem: {
      fontColor: { active: colors.B40, inactive: colors.B80 },
      icon: { active: colors.B40, inactive: colors.B80 },
      switch: {
        backgroundChecked: colors.vertical,
        backgroundUnchecked: colors.B80,
      },
    },
  },
  footer: { logoTextColor: 'black', logoPrefixFontColor: colors.B70 },
  loaderColor: colors.loader,
};

const defaultDarkTheme: INovuTheme = {
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
    markAllAsReadButtonColor: colors.B60,
  },
  popover: { arrowColor: colors.B15 },
  actionsMenu: {
    dropdownColor: colors.B20,
    hoverColor: colors.B30,
    fontColor: colors.white,
    dotsButtonColor: colors.B40,
  },
  notificationItem: {
    read: { background: colors.B17, fontColor: colors.white, timeMarkFontColor: colors.B40 },
    unread: {
      background: colors.B20,
      fontColor: colors.white,
      boxShadow: shadows.dark,
      notificationItemBeforeBrandColor: colors.vertical,
      timeMarkFontColor: colors.B60,
    },
    buttons: darkButtonStyle,
  },
  userPreferences: {
    settingsButtonColor: colors.B40,
    accordion: {
      background: colors.B20,
      fontColor: colors.white,
      secondaryFontColor: colors.B60,
      boxShadow: shadows.dark,
      arrowColor: colors.B60,
      dividerColor: colors.B30,
    },
    accordionItem: {
      fontColor: { active: colors.white, inactive: colors.B60 },
      icon: { active: colors.white, inactive: colors.B40 },
      switch: {
        backgroundChecked: colors.vertical,
        backgroundUnchecked: colors.B30,
      },
    },
  },
  footer: { logoTextColor: colors.white, logoPrefixFontColor: colors.B40 },
  loaderColor: colors.loader,
};

const defaultCommonTheme: ICommonTheme = {
  fontFamily: 'inherit',
};

const defaultNotificationBellLightTheme: INotificationBellColors = {
  unseenBadgeColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  unseenBadgeBackgroundColor: colors.white,
};

const defaultNotificationBellDarkTheme: INotificationBellColors = {
  unseenBadgeColor: { stopColor: '#FF512F', stopColorOffset: '#DD2476' },
  unseenBadgeBackgroundColor: colors.B15,
};

export {
  defaultLightTheme,
  defaultDarkTheme,
  defaultCommonTheme,
  defaultNotificationBellLightTheme,
  defaultNotificationBellDarkTheme,
};
