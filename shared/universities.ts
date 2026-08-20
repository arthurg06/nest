// Canonical list of Madrid universities, shared by the client (the university
// selector on sign-up and profile editing) and the server (validation), so the
// approved values live in exactly one place.
//
// Scope — institutions a NEST member can actually study at in Madrid:
// the six public universities of the Comunidad de Madrid, the national
// institutions headquartered in Madrid (UNED, UIMP), the church university
// (Comillas), the private universities recognized by the Comunidad de Madrid,
// and IE University's Madrid campus. Universities based elsewhere in Spain or
// abroad are intentionally absent — do not add them.

export interface MadridUniversity {
  /** Canonical name — exactly what is stored on the profile and offered by
      the selector. */
  name: string;
  /** Alternate names and abbreviations that search and validation also accept. */
  aliases: string[];
  /** Commonly recognized short name, shown wherever profiles display the
      university. Absent when no widely used abbreviation exists — the full
      name is shown then. Storage always keeps the canonical full name. */
  shortName?: string;
}

export const MADRID_UNIVERSITIES: MadridUniversity[] = [
  // Public universities of the Comunidad de Madrid
  { name: "Universidad Complutense de Madrid", aliases: ["UCM", "Complutense"], shortName: "UCM" },
  { name: "Universidad Autónoma de Madrid", aliases: ["UAM", "Autonoma"], shortName: "UAM" },
  { name: "Universidad Politécnica de Madrid", aliases: ["UPM", "Politecnica"], shortName: "UPM" },
  { name: "Universidad Carlos III de Madrid", aliases: ["UC3M", "Carlos III"], shortName: "UC3M" },
  { name: "Universidad Rey Juan Carlos", aliases: ["URJC"], shortName: "URJC" },
  { name: "Universidad de Alcalá", aliases: ["UAH", "Alcala"], shortName: "UAH" },
  // National public institutions headquartered in Madrid
  { name: "Universidad Nacional de Educación a Distancia", aliases: ["UNED"], shortName: "UNED" },
  { name: "Universidad Internacional Menéndez Pelayo", aliases: ["UIMP", "Menendez Pelayo"], shortName: "UIMP" },
  // Church-affiliated
  { name: "Universidad Pontificia Comillas", aliases: ["Comillas", "ICADE", "ICAI"], shortName: "Comillas" },
  // Private universities (plus IE University's Madrid campus)
  { name: "IE University", aliases: ["IE", "Instituto de Empresa", "IE School of Science and Technology"] },
  { name: "Universidad CEU San Pablo", aliases: ["CEU", "San Pablo CEU"], shortName: "CEU San Pablo" },
  { name: "Universidad Francisco de Vitoria", aliases: ["UFV"], shortName: "UFV" },
  { name: "Universidad Europea de Madrid", aliases: ["UEM", "Europea"], shortName: "UEM" },
  { name: "Universidad Nebrija", aliases: ["Antonio de Nebrija"], shortName: "Nebrija" },
  { name: "Universidad Alfonso X el Sabio", aliases: ["UAX"], shortName: "UAX" },
  { name: "Universidad Camilo José Cela", aliases: ["UCJC"], shortName: "UCJC" },
  { name: "Universidad Villanueva", aliases: ["Internacional Villanueva"], shortName: "Villanueva" },
  { name: "CUNEF Universidad", aliases: ["CUNEF"], shortName: "CUNEF" },
  { name: "ESIC University", aliases: ["ESIC", "ESIC Universidad"], shortName: "ESIC" },
  { name: "UNIE Universidad", aliases: ["UNIE", "Universidad Internacional de la Empresa"], shortName: "UNIE" },
  { name: "Universidad a Distancia de Madrid", aliases: ["UDIMA"], shortName: "UDIMA" },
  { name: "Universidad de Diseño, Innovación y Tecnología", aliases: ["UDIT", "ESNE"], shortName: "UDIT" },
];

export const MADRID_UNIVERSITY_NAMES = MADRID_UNIVERSITIES.map(u => u.name);

// Accent/case/whitespace-insensitive key so "universidad politécnica de
// madrid" and "Universidad  Politecnica de Madrid" resolve to the same entry.
export function universityKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_BY_KEY = new Map<string, string>();
for (const uni of MADRID_UNIVERSITIES) {
  CANONICAL_BY_KEY.set(universityKey(uni.name), uni.name);
  for (const alias of uni.aliases) {
    CANONICAL_BY_KEY.set(universityKey(alias), uni.name);
  }
}

/**
 * Resolve arbitrary input to the canonical university name, or null when the
 * value is not an approved Madrid university.
 */
export function canonicalUniversity(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return CANONICAL_BY_KEY.get(universityKey(value)) ?? null;
}


const SHORT_BY_KEY = new Map<string, string>();
for (const uni of MADRID_UNIVERSITIES) {
  if (uni.shortName) {
    SHORT_BY_KEY.set(universityKey(uni.name), uni.shortName);
    for (const alias of uni.aliases) SHORT_BY_KEY.set(universityKey(alias), uni.shortName);
  }
}

/**
 * How a university is DISPLAYED across the app (cards, matches, chats,
 * admin lists): the commonly recognized short name when one exists,
 * otherwise the value unchanged. Storage and the selector always use the
 * canonical full name; legacy free-text values pass through untouched.
 */
export function displayUniversity(value: string | undefined | null): string {
  if (!value) return "";
  return SHORT_BY_KEY.get(universityKey(value)) ?? value;
}

/** Filter for the searchable selector: matches the name or any alias. */
export function searchUniversities(query: string): MadridUniversity[] {
  const q = universityKey(query);
  if (!q) return MADRID_UNIVERSITIES;
  return MADRID_UNIVERSITIES.filter(
    u => universityKey(u.name).includes(q) || u.aliases.some(a => universityKey(a).includes(q))
  );
}
