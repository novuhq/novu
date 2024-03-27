import { useLocalStorage } from '@mantine/hooks';

const STORAGE_KEY = 'mantine-theme';
const DEFAULT_THEME_TITLE = 'Match System Appearance';

export enum ColorSchemePreferenceEnum {
  DARK = 'dark',
  LIGHT = 'light',
  SYSTEM = 'system',
}

export const THEME_TITLE_LOOKUP: Record<ColorSchemePreferenceEnum, string> = {
  [ColorSchemePreferenceEnum.DARK]: 'Dark Theme',
  [ColorSchemePreferenceEnum.LIGHT]: 'Light Theme',
  [ColorSchemePreferenceEnum.SYSTEM]: DEFAULT_THEME_TITLE,
};

export function useLocalThemePreference() {
  const [themeStatus, setThemeStatus] = useLocalStorage<ColorSchemePreferenceEnum>({
    key: STORAGE_KEY,
    defaultValue: ColorSchemePreferenceEnum.SYSTEM,
    getInitialValueInEffect: true,
  });

  return { themeStatus, setThemeStatus };
}
