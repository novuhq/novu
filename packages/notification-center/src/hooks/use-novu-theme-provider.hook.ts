import { useContext } from 'react';
import { ColorScheme, ICommonTheme } from '../index';
import { INovuTheme, ThemeContext } from '../store/novu-theme.context';

export function useNovuTheme(): {
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
