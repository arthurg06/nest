// Centralized theme state (single source of truth for the whole app).
// Components read it via useSyncExternalStore; the store owns persistence,
// the <html> class, the theme-color meta, and the OS-preference listener.
import {
  ThemePreference,
  ResolvedTheme,
  resolveTheme,
  nextPreference,
  readStoredPreference,
  storePreference,
  systemPrefersDark,
  applyResolvedTheme,
  watchSystemTheme,
} from "./theme";

let preference: ThemePreference = readStoredPreference();
let systemDark = systemPrefersDark();
const listeners = new Set<() => void>();

function apply(): void {
  applyResolvedTheme(resolveTheme(preference, systemDark));
}

function emit(): void {
  for (const listener of listeners) listener();
}

// Follow OS changes while the preference is "system".
watchSystemTheme((dark) => {
  systemDark = dark;
  if (preference === "system") {
    apply();
    emit();
  }
});

// The pre-paint script in index.html already set the class; re-applying here
// keeps store state and DOM in sync from the first render.
apply();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getResolvedTheme(): ResolvedTheme {
  return resolveTheme(preference, systemDark);
}

export function getThemePreference(): ThemePreference {
  return preference;
}

export function toggleTheme(): void {
  preference = nextPreference(preference, systemDark);
  storePreference(preference);
  apply();
  emit();
}
