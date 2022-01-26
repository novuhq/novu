import { useEffect, useState } from 'react';

export function useThemeController() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (currentTheme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  }, [currentTheme]);

  function toggleTheme() {
    if (currentTheme === 'light') {
      setCurrentTheme('dark');
    } else {
      setCurrentTheme('light');
    }
  }

  return {
    currentTheme,
    setCurrentTheme,
    toggleTheme,
  };
}
