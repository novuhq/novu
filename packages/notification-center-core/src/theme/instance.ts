import { INovuTheme } from './types';

let theme: INovuTheme = null;

export const setTheme = (newTheme: INovuTheme) => {
  theme = newTheme;

  return theme;
};

export const getTheme = () => {
  if (!theme) {
    throw new Error('The theme is not set yet.');
  }

  return theme;
};
