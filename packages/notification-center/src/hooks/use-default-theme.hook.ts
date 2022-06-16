import { defaultCommonTheme, defaultDarkTheme, defaultLightTheme } from '../shared/config/themeDefaultValues';
import { ICommonTheme, INovuThemeProvider } from '../store/novu-theme-provider.context';
import { INovuTheme } from '../store/novu-theme.context';
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
