import { ThemeVarsPartial } from '@storybook/theming';
import { create } from '@storybook/theming/create';
import lightLogo from './public/novu-logo-light.svg';
import darkLogo from './public/novu-logo-dark.svg';


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
  brandImage: lightLogo,
});

export const darkTheme = create({
  ...themeBase,
  base: 'dark',
  brandImage: darkLogo,
});
