import {
  defaultCommonTheme,
  defaultDarkTheme,
  defaultLightTheme,
  defaultNotificationBellDarkTheme,
  defaultNotificationBellLightTheme,
} from '../shared/config/themeDefaultValues';
import { ICommonTheme, INovuThemeProvider } from '../store/novu-theme-provider.context';
import { INotificationBellTheme, INovuTheme } from '../store/novu-theme.context';
import merge from 'lodash.merge';
import { ColorScheme } from '../index';

interface IDefaultThemeProps {
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

export interface IDefaultBellThemeProps {
  theme?: INotificationBellTheme;
  colorScheme?: ColorScheme;
}

export function useDefaultBellTheme(props: IDefaultBellThemeProps): {
  theme: INotificationBellTheme;
} {
  const colorScheme = props?.colorScheme ? props?.colorScheme : 'light';

  const theme =
    colorScheme === 'light'
      ? merge(defaultNotificationBellLightTheme, props?.theme)
      : merge(defaultNotificationBellDarkTheme, props?.theme);

  return {
    theme,
  };
}
