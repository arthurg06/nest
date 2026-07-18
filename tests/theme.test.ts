import { describe, it, expect } from "vitest";
import { resolveTheme, nextPreference, isThemePreference } from "../src/lib/theme";

describe("theme preference logic", () => {
  it("resolves explicit preferences regardless of the OS setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS setting while on system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("toggles to the opposite of what is currently showing", () => {
    // From system: switch away from whatever the OS shows
    expect(nextPreference("system", true)).toBe("light");
    expect(nextPreference("system", false)).toBe("dark");
    // Explicit preferences flip
    expect(nextPreference("dark", false)).toBe("light");
    expect(nextPreference("light", true)).toBe("dark");
  });

  it("round-trips: toggling twice restores the resolved theme", () => {
    for (const systemDark of [true, false]) {
      const once = nextPreference("system", systemDark);
      const twice = nextPreference(once, systemDark);
      expect(resolveTheme(twice, systemDark)).toBe(resolveTheme("system", systemDark));
    }
  });

  it("validates stored values strictly", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});
