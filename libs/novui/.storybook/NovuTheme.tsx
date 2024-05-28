import { ThemeVarsPartial } from '@storybook/theming';
import { create } from '@storybook/theming/create';

const themeBase: ThemeVarsPartial = {
  base: 'light',
  brandTitle: 'Novu Design System',
  brandTarget: '_self',
}
/**
 * Novu Design System theme for Storybook
 * 
 * @see https://storybook.js.org/docs/configure/theming
 */
export const lightTheme = create({
  ...themeBase,
  brandImage: './novu-logo-light.svg',
});

export const darkTheme = create({
  ...themeBase,
  base: 'dark',
  brandImage: './novu-logo-dark.svg',
});
