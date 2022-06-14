import { defaultDarkTheme, defaultLightTheme } from '../shared/config/themeDefaultValues';
import { INovuThemeProvider } from '../store/novu-theme-provider.context';
import { INovuTheme } from '../store/novu-theme.context';
import { merge } from 'lodash';

interface IDefaultThemeProps {
  theme: INovuThemeProvider;
}

export function useDefaultTheme(props: IDefaultThemeProps): {
  theme: INovuTheme;
} {
  const novuTheme =
    props.theme.colorScheme === 'light'
      ? merge(defaultLightTheme, props.theme.light)
      : merge(defaultDarkTheme, props.theme.dark);

  const theme = merge(novuTheme, props.theme.common);

  return {
    theme,
  };
}
