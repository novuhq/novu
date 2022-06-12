import React from 'react';
import { INovuTheme, ThemeContext } from './novu-theme.context';
import { ColorScheme } from '../index';
import { defaultDarkTheme, defaultLightTheme } from '../shared/config/themeDefaultValues';

export interface INovuProvider {
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
  theme: INovuProvider;
}

export function NovuThemeProvider(props: INovuThemeProviderProps) {
  const novuTheme =
    props.theme.colorScheme === 'light'
      ? { ...defaultLightTheme, ...props.theme.light }
      : { ...defaultDarkTheme, ...props.theme.dark };

  const providerTheme = { ...novuTheme, ...props.theme.common };

  return (
    <ThemeContext.Provider value={{ colorScheme: props.theme.colorScheme, theme: { ...providerTheme } }}>
      {props.children}
    </ThemeContext.Provider>
  );
}
