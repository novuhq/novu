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

export interface IButtonStyles {
  backGroundColor: string;
  fontColor: string;
  removeCircleColor: string;
  fontFamily: string;
}

export interface IStyleButtons {
  primary: IButtonStyles;
  secondary: IButtonStyles;
  clicked: IButtonStyles;
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
  buttons: IStyleButtons;
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

export interface INovuTheme {
  layout?: IThemeLayout;
  header?: IThemeHeader;
  popover?: IThemePopover;
  notificationItem?: IThemeNotificationListItem;
  userPreferences?: IThemeUserPreferences;
  footer?: IThemeFooter;
  loaderColor?: string;
}

export interface ICommonTheme {
  fontFamily?: string;
}

export interface ISvgStopColor {
  stopColor?: string;
  stopColorOffset?: string;
}

export interface INotificationBellColors {
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
}
