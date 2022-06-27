import {
  defaultCommonTheme,
  defaultDarkTheme,
  defaultLightTheme,
  defaultNotificationBellDarkTheme,
  defaultNotificationBellLightTheme,
} from '../shared/config/themeDefaultValues';
import { ICommonTheme, INovuThemeProvider } from '../store/novu-theme-provider.context';
import { INotificationBellColors, INovuTheme, ISvgStopColor } from '../store/novu-theme.context';
import merge from 'lodash.merge';
import { ColorScheme } from '../index';

export interface IDefaultThemeProps {
  colorScheme: ColorScheme;
  theme: INovuThemeProvider;
}

export function useDefaultTheme(props: IDefaultThemeProps): {
  theme: INovuTheme;
  common: ICommonTheme;
} {
  const theme =
    props.colorScheme === 'light'
      ? merge(defaultLightTheme, props?.theme?.light)
      : merge(defaultDarkTheme, props?.theme?.dark);

  const common = merge(defaultCommonTheme, props?.theme?.common);

  return {
    theme,
    common,
  };
}

export interface IDefaultBellColors {
  colorScheme?: ColorScheme;
  fillColor?: string | ISvgStopColor;
  borderColor?: string;
}

export function useDefaultBellColors(props: IDefaultBellColors): { bellColors: INotificationBellColors } {
  const colorScheme = props?.colorScheme ? props?.colorScheme : 'light';

  const notificationBellColors: INotificationBellColors = {
    fillColor: props?.fillColor,
    borderColor: props?.borderColor,
  };

  const bellColors =
    colorScheme === 'light'
      ? merge(defaultNotificationBellLightTheme, notificationBellColors)
      : merge(defaultNotificationBellDarkTheme, notificationBellColors);

  return {
    bellColors,
  };
}
