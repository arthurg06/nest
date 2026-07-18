// Theme preference logic. Pure functions are kept separate from DOM effects
// so the resolution rules are unit-testable.
//
// Preference model: "light" | "dark" | "system" (default). The preference is
// persisted in localStorage; the resolved theme applies the `dark` class on
// <html>. A tiny inline script in index.html runs the same resolution before
// first paint so the wrong theme never flashes.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "nest_theme";

// Keep in sync with --background in src/index.css (used for the browser
// chrome / PWA title bar via <meta name="theme-color">).
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#fff0f8",
  dark: "#1a0922",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

// The control is a compact light⇄dark toggle: from "system" it switches to
// the opposite of whatever is currently showing, then stays explicit.
export function nextPreference(current: ThemePreference, systemPrefersDark: boolean): ThemePreference {
  return resolveTheme(current, systemPrefersDark) === "dark" ? "light" : "dark";
}

export function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function storePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Storage unavailable (private mode) — the session still themes correctly.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Applies the resolved theme to the document: the `dark` class (which flips
// every token), plus the browser-chrome color.
export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[theme]);
}

// Subscribes to OS theme changes; the callback fires only while the stored
// preference is "system". Returns an unsubscribe function.
export function watchSystemTheme(onChange: (systemDark: boolean) => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
