import React from 'react';
import { INovuPopoverTheme, INovuTheme, ThemeContext } from './novu-theme.context';
import { ColorScheme } from '../index';
import { getDefaultTheme } from '../utils/defaultTheme';

export interface INovuThemePopoverProvider {
  light?: INovuPopoverTheme;
  dark?: INovuPopoverTheme;
  common?: ICommonTheme;
}

export interface INovuThemeProvider {
  light?: INovuTheme;
  dark?: INovuTheme;
  common?: ICommonTheme;
}

export interface ICommonTheme {
  fontFamily?: string;
}

interface INovuThemeProviderProps {
  children: React.ReactNode;
  colorScheme: ColorScheme;
  theme: INovuThemeProvider;
}

export function NovuThemeProvider(props: INovuThemeProviderProps) {
  const { theme, common } = getDefaultTheme({ colorScheme: props.colorScheme, theme: props.theme });

  return (
    <ThemeContext.Provider value={{ colorScheme: props.colorScheme, theme: { ...theme }, common: { ...common } }}>
      {props.children}
    </ThemeContext.Provider>
  );
}
