import React from 'react';
import { INovuTheme, ThemeContext } from './novu-theme.context';
import { ColorScheme } from '../index';
import { useDefaultTheme } from '../hooks';

export interface INovuThemeProvider {
  colorScheme: ColorScheme;
  light?: INovuTheme;
  dark?: INovuTheme;
  common?: ICommonTheme;
}

interface ICommonTheme {
  fontFamily: string;
}

interface INovuThemeProviderProps {
  children: React.ReactNode;
  theme: INovuThemeProvider;
}

export function NovuThemeProvider(props: INovuThemeProviderProps) {
  const { theme } = useDefaultTheme({ theme: props.theme });

  return (
    <ThemeContext.Provider value={{ colorScheme: props.theme.colorScheme, theme: { ...theme } }}>
      {props.children}
    </ThemeContext.Provider>
  );
}
