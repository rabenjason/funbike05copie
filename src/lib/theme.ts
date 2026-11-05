/** Versioned preference prevents an old saved light choice from overriding the newly requested dark-first experience. */
const THEME_KEY = "fb-theme-v2";

export function readDarkPreference(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== "light";
  } catch {
    return true;
  }
}

export function persistTheme(isDark: boolean): void {
  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch {
    // Theme still works for this session when browser storage is unavailable.
  }
}
