import React from 'react';
import { ColorScheme } from '../index';

export interface IThemeContext {
  colorScheme: ColorScheme;
}

export const ThemeContext = React.createContext<IThemeContext>({
  colorScheme: 'light',
});
