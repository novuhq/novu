import { useLocalStorage } from '@mantine/hooks';

export default function Themeprovider() {
  const [themeStatus, setThemeStatus] = useLocalStorage<string>({
    key: 'mantine-theme',
    defaultValue: 'system',
    getInitialValueInEffect: true,
  });

  return { themeStatus, setThemeStatus };
}
