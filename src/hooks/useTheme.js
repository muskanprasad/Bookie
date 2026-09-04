import { useState, useEffect } from 'react';

const THEMES = ['midnight', 'daylight', 'sepia'];
const STORAGE_KEY = 'bookie-theme';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'midnight';
  });

  const setTheme = (newTheme) => {
    if (THEMES.includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.dataset.theme = newTheme;
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { theme, setTheme, themes: THEMES };
}
