import React from 'react';

export type IThemeContext = {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
};

export const ThemeContext = React.createContext<IThemeContext>({
  theme: 'light',
  setTheme: () => null,
  toggleTheme: () => null,
});
