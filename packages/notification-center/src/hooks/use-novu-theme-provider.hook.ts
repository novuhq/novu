import { useContext } from 'react';
import { INovuTheme, ThemeContext } from '../store/novu-theme.context';
import { ICommonTheme } from '../store/novu-theme-provider.context';
import { ColorScheme } from '../index';

export function useNovuThemeProvider(): {
  theme: INovuTheme;
  common: ICommonTheme;
  colorScheme: ColorScheme;
} {
  const { colorScheme, theme, common } = useContext(ThemeContext);

  return {
    colorScheme,
    theme,
    common,
  };
}
