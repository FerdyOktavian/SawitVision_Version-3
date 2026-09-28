export const THEME_STORAGE_KEY = "sawitvision-theme";
export const THEMES = ["light", "dark"];

export function isValidTheme(value) {
  return THEMES.includes(value);
}

export function getStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  const nextTheme = isValidTheme(theme) ? theme : "light";
  document.documentElement.dataset.theme = nextTheme;
  return nextTheme;
}

export function initializeTheme() {
  return applyTheme(getStoredTheme());
}

export function saveTheme(theme) {
  const nextTheme = applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Theme tetap aktif untuk sesi saat ini jika storage tidak tersedia.
  }
  return nextTheme;
}
