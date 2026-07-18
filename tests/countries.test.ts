import { describe, it, expect } from "vitest";
import {
  COUNTRY_OPTIONS,
  searchCountries,
  normalizeNationalityEntry,
  normalizeStoredNationalities,
  splitStoredNationalities,
  formatNationality
} from "../shared/countries";

describe("countries dataset", () => {
  it("includes Palestine with the Palestinian demonym and flag", () => {
    const palestine = COUNTRY_OPTIONS.find(c => c.code === "PS");
    expect(palestine).toBeTruthy();
    expect(palestine!.name).toBe("Palestine");
    expect(palestine!.demonym).toBe("Palestinian");
    expect(palestine!.flag).toBe("🇵🇸");
  });

  it("covers UN members plus observers, Taiwan, and Kosovo (197 entries)", () => {
    expect(COUNTRY_OPTIONS).toHaveLength(197);
  });

  it("has unique codes and unique names", () => {
    const codes = COUNTRY_OPTIONS.map(c => c.code);
    const names = COUNTRY_OPTIONS.map(c => c.name);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("is sorted alphabetically by display name", () => {
    const names = COUNTRY_OPTIONS.map(c => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "en"));
    expect(names).toEqual(sorted);
  });

  it("derives every flag from the ISO code", () => {
    for (const country of COUNTRY_OPTIONS) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.flag.length).toBeGreaterThan(0);
    }
    expect(COUNTRY_OPTIONS.find(c => c.code === "ES")!.flag).toBe("🇪🇸");
    expect(COUNTRY_OPTIONS.find(c => c.code === "FR")!.flag).toBe("🇫🇷");
  });

  it("finds countries by name, demonym, and historical alias", () => {
    expect(searchCountries("palest").some(c => c.code === "PS")).toBe(true);
    expect(searchCountries("dutch").some(c => c.code === "NL")).toBe(true);
    expect(searchCountries("turkey").some(c => c.code === "TR")).toBe(true);
    expect(searchCountries("ivory coast").some(c => c.code === "CI")).toBe(true);
    expect(searchCountries("")).toHaveLength(COUNTRY_OPTIONS.length);
  });
});

describe("legacy stored values", () => {
  it("splits stored multi-nationality strings safely, including names with commas", () => {
    expect(splitStoredNationalities("Iran 🇮🇷, United Arab Emirates 🇦🇪")).toEqual([
      "Iran 🇮🇷",
      "United Arab Emirates 🇦🇪"
    ]);
    expect(splitStoredNationalities("Korea, South 🇰🇷, Spain 🇪🇸")).toEqual([
      "Korea, South 🇰🇷",
      "Spain 🇪🇸"
    ]);
  });

  it("normalizes legacy names to canonical entries", () => {
    expect(normalizeNationalityEntry("Korea, South 🇰🇷")).toBe("South Korea 🇰🇷");
    expect(normalizeNationalityEntry("Turkey 🇹🇷")).toBe("Türkiye 🇹🇷");
    expect(normalizeNationalityEntry("Spain 🇪🇸")).toBe("Spain 🇪🇸");
  });

  it("passes unknown values through unchanged", () => {
    expect(normalizeNationalityEntry("Atlantis 🌊")).toBe("Atlantis 🌊");
    expect(normalizeNationalityEntry("Somewhere")).toBe("Somewhere");
  });

  it("normalizes full stored strings", () => {
    expect(normalizeStoredNationalities("Korea, South 🇰🇷, Iran 🇮🇷")).toBe("South Korea 🇰🇷, Iran 🇮🇷");
  });

  it("format helper produces the stored representation", () => {
    const spain = COUNTRY_OPTIONS.find(c => c.code === "ES")!;
    expect(formatNationality(spain)).toBe("Spain 🇪🇸");
  });
});
