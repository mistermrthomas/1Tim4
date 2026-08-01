export type PathTheme = 'dark' | 'light';

export const PATH_THEME_STORAGE_KEY = 'path-theme';

export function readStoredTheme(): PathTheme {
  try {
    const value = localStorage.getItem(PATH_THEME_STORAGE_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    /* private mode */
  }
  return 'dark';
}

export function storeTheme(theme: PathTheme): void {
  try {
    localStorage.setItem(PATH_THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}
