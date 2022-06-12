import { useContext } from 'react';
import { ThemeContext } from '../store/novu-theme.context';

export function useNovuThemeProvider() {
  const { colorScheme, theme } = useContext(ThemeContext);

  return {
    colorScheme,
    theme,
  };
}
