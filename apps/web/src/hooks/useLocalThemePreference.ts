import { useLocalStorage } from '@mantine/hooks';

export function useLocalThemePreference() {
  const [themeStatus, setThemeStatus] = useLocalStorage<string>({
    key: 'mantine-theme',
    defaultValue: 'system',
    getInitialValueInEffect: true,
  });

  return { themeStatus, setThemeStatus };
}
