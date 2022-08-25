import { useContext } from 'react';
import { INovuTheme, ThemeContext, ICommonTheme } from '../store';
import { ColorScheme } from '../index';

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
