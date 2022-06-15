import { defaultCommonTheme, defaultDarkTheme, defaultLightTheme } from '../shared/config/themeDefaultValues';
import { ICommonTheme, INovuThemeProvider } from '../store/novu-theme-provider.context';
import { INovuTheme } from '../store/novu-theme.context';
import { mapCommon, mapTheme } from '../shared/utils/themeMapper';
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
      ? mapTheme(defaultLightTheme, props?.theme?.light)
      : mapTheme(defaultDarkTheme, props?.theme?.dark);

  const common = mapCommon(defaultCommonTheme, props?.theme?.common);

  return {
    theme,
    common,
  };
}
