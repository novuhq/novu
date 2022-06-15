import { INovuTheme } from '../../store/novu-theme.context';
import { getLinearGradientColorStopValues } from './getLinearGradientColorStopValues';
import { ICommonTheme } from '../../store/novu-theme-provider.context';

export function mapTheme(defaultTheme: INovuTheme, userTheme: INovuTheme): INovuTheme {
  const themeGeneral = mapGeneral(defaultTheme?.general, userTheme?.general);

  return {
    layout: mapLayout(defaultTheme?.layout, userTheme?.layout, themeGeneral),
    header: mapHeader(defaultTheme?.header, userTheme?.header, themeGeneral),
    popover: mapPopover(defaultTheme?.popover, userTheme?.popover, themeGeneral),
    notificationListItem: mapNotificationListItem(
      defaultTheme?.notificationListItem,
      userTheme?.notificationListItem,
      themeGeneral
    ),
    footer: mapFooter(defaultTheme?.footer, userTheme?.footer),
    mainColor: userTheme?.mainColor || themeGeneral?.mainBrandColor || defaultTheme?.mainColor,
    bellGradientDot: mapBellGradientDot(defaultTheme?.bellGradientDot, userTheme?.bellGradientDot, themeGeneral),
  };
}

export function mapCommon(defaultCommonTheme: ICommonTheme, userCommonTheme: ICommonTheme): ICommonTheme {
  return {
    fontFamily: defaultCommonTheme?.fontFamily || userCommonTheme?.fontFamily,
  };
}

export function mapLayout(
  defaultThemeLayout: IThemeLayout,
  userThemeLayout: IThemeLayout,
  themeGeneral: IThemeGeneral
): IThemeLayout {
  return {
    background: userThemeLayout?.background || themeGeneral?.backgroundColor || defaultThemeLayout?.background,
    boxShadow: userThemeLayout?.boxShadow || themeGeneral?.boxShadowColor || defaultThemeLayout?.boxShadow,
    wrapper: {
      secondaryFontColor:
        userThemeLayout?.wrapper?.secondaryFontColor || defaultThemeLayout?.wrapper?.secondaryFontColor,
    },
  };
}

export function mapHeader(
  defaultThemeHeader: IThemeHeader,
  userThemeHeader: IThemeHeader,
  themeGeneral: IThemeGeneral
): IThemeHeader {
  return {
    fontColor: userThemeHeader?.fontColor || themeGeneral?.fontColor || defaultThemeHeader?.fontColor,
    badgeColor: userThemeHeader?.badgeColor || themeGeneral?.mainBrandColor || defaultThemeHeader?.badgeColor,
    badgeTextColor: userThemeHeader?.badgeTextColor || defaultThemeHeader?.badgeTextColor,
  };
}

export function mapPopover(
  defaultThemePopover: IThemePopover,
  userThemePopover: IThemePopover,
  themeGeneral: IThemeGeneral
): IThemePopover {
  return {
    arrowColor: userThemePopover?.arrowColor || themeGeneral?.backgroundColor || defaultThemePopover?.arrowColor,
  };
}

export function mapNotificationListItem(
  defaultThemeNotificationListItem: IThemeNotificationListItem,
  userThemeNotificationListItem: IThemeNotificationListItem,
  themeGeneral: IThemeGeneral
): IThemeNotificationListItem {
  return {
    seen: {
      background: userThemeNotificationListItem?.seen?.background || defaultThemeNotificationListItem?.seen?.background,
      fontColor:
        userThemeNotificationListItem?.seen?.fontColor ||
        themeGeneral?.fontColor ||
        defaultThemeNotificationListItem?.seen?.fontColor,
      timeMarkFontColor:
        userThemeNotificationListItem?.seen?.timeMarkFontColor ||
        defaultThemeNotificationListItem?.seen?.timeMarkFontColor,
    },
    unseen: {
      fontColor:
        userThemeNotificationListItem?.unseen?.fontColor ||
        themeGeneral?.fontColor ||
        defaultThemeNotificationListItem?.unseen?.fontColor,
      background:
        userThemeNotificationListItem?.unseen?.background ||
        themeGeneral?.backgroundColor ||
        defaultThemeNotificationListItem?.unseen?.background,
      notificationItemBeforeBrandColor:
        userThemeNotificationListItem?.unseen?.notificationItemBeforeBrandColor ||
        themeGeneral?.mainBrandColor ||
        defaultThemeNotificationListItem?.unseen?.notificationItemBeforeBrandColor,
      boxShadow:
        userThemeNotificationListItem?.unseen?.boxShadow ||
        themeGeneral?.boxShadowColor ||
        defaultThemeNotificationListItem?.unseen?.boxShadow,
      timeMarkFontColor:
        userThemeNotificationListItem?.unseen?.timeMarkFontColor ||
        defaultThemeNotificationListItem?.unseen?.timeMarkFontColor,
    },
  };
}

export function mapFooter(defaultThemeFooter: IThemeFooter, userThemeFooter: IThemeFooter): IThemeFooter {
  return {
    logoTextColor: userThemeFooter?.logoTextColor || defaultThemeFooter?.logoTextColor,
    logoPrefixFontColor: userThemeFooter?.logoPrefixFontColor || defaultThemeFooter?.logoPrefixFontColor,
  };
}

export function mapBellGradientDot(
  defaultThemeBellGradientDot: IThemeBellGradientDot,
  userThemeBellGradientDot: IThemeBellGradientDot,
  themeGeneral: IThemeGeneral
): IThemeBellGradientDot {
  const stopColors = themeGeneral?.mainBrandColor?.includes('gradient')
    ? getLinearGradientColorStopValues(themeGeneral?.mainBrandColor)
    : themeGeneral?.mainBrandColor;

  return {
    color: {
      stopColor:
        userThemeBellGradientDot?.color?.stopColor ||
        getStopColor(stopColors, 0) ||
        defaultThemeBellGradientDot?.color?.stopColor,
      stopColorOffset:
        userThemeBellGradientDot?.color?.stopColorOffset ||
        getStopColor(stopColors, 1) ||
        defaultThemeBellGradientDot?.color?.stopColorOffset,
      borderColor:
        userThemeBellGradientDot?.color?.borderColor ||
        themeGeneral?.backgroundColor ||
        defaultThemeBellGradientDot?.color?.borderColor,
    },
  };
}

export function mapGeneral(defaultThemeGeneral: IThemeGeneral, userThemeGeneral: IThemeGeneral): IThemeGeneral {
  return {
    backgroundColor: userThemeGeneral?.backgroundColor || defaultThemeGeneral?.backgroundColor,
    mainBrandColor: userThemeGeneral?.mainBrandColor || defaultThemeGeneral?.mainBrandColor,
    boxShadowColor: userThemeGeneral?.boxShadowColor || defaultThemeGeneral?.boxShadowColor,
    fontColor: userThemeGeneral?.fontColor || defaultThemeGeneral?.fontColor,
  };
}

function getStopColor(stopColors: string | Array<string>, index: number): string | null {
  return stopColors ? (Array.isArray(stopColors) ? stopColors[index] : stopColors) : null;
}

export interface IThemeLayout {
  background?: string;
  boxShadow?: string;
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

export interface IThemeBellGradientDot {
  color?: {
    stopColor?: string;
    stopColorOffset?: string;
    borderColor?: string;
  };
}

export interface IThemeGeneral {
  backgroundColor?: string;
  mainBrandColor?: string;
  boxShadowColor?: string;
  fontColor?: string;
}
