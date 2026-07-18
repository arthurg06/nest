// Canonical country / nationality dataset, shared by the React frontend and
// the Express server.
//
// Coverage policy: all 193 UN member states, both UN observer states
// (Palestine, Vatican City), plus Taiwan and Kosovo — 197 entries. Regions
// and territories (e.g. Hong Kong, Puerto Rico) can be added on request.
//
// Sources & limitations:
// - Codes follow ISO 3166-1 alpha-2 (Kosovo uses the customary user-assigned
//   code XK, which has no official flag emoji on every platform).
// - Names are current common English short names (e.g. "Türkiye",
//   "Eswatini", "Timor-Leste"); former names are kept as search aliases.
// - There is NO single official international standard for English demonyms.
//   The `demonym` values follow common English adjectival usage as compiled
//   in the CIA World Factbook / Wikipedia list of adjectivals and demonyms.
//   Where local forms differ (e.g. Motswana/Batswana for Botswana), the most
//   widely understood English form was chosen. This list is curated, not
//   claimed universally complete or authoritative.

export interface CountryOption {
  /** ISO 3166-1 alpha-2 code (XK = Kosovo, user-assigned). */
  code: string;
  /** Human-readable English short name (UI label). */
  name: string;
  /** Common English demonym / nationality adjective. */
  demonym: string;
  /** Flag emoji derived from the ISO code. */
  flag: string;
  /** Former or alternative names accepted in search. */
  aliases?: string[];
}

// Regional-indicator flag emoji from an ISO alpha-2 code.
const flagOf = (code: string): string =>
  String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));

type Row = [code: string, name: string, demonym: string, aliases?: string[]];

const ROWS: Row[] = [
  ["AF", "Afghanistan", "Afghan"],
  ["AL", "Albania", "Albanian"],
  ["DZ", "Algeria", "Algerian"],
  ["AD", "Andorra", "Andorran"],
  ["AO", "Angola", "Angolan"],
  ["AG", "Antigua and Barbuda", "Antiguan"],
  ["AR", "Argentina", "Argentine"],
  ["AM", "Armenia", "Armenian"],
  ["AU", "Australia", "Australian"],
  ["AT", "Austria", "Austrian"],
  ["AZ", "Azerbaijan", "Azerbaijani"],
  ["BS", "Bahamas", "Bahamian"],
  ["BH", "Bahrain", "Bahraini"],
  ["BD", "Bangladesh", "Bangladeshi"],
  ["BB", "Barbados", "Barbadian"],
  ["BY", "Belarus", "Belarusian"],
  ["BE", "Belgium", "Belgian"],
  ["BZ", "Belize", "Belizean"],
  ["BJ", "Benin", "Beninese"],
  ["BT", "Bhutan", "Bhutanese"],
  ["BO", "Bolivia", "Bolivian"],
  ["BA", "Bosnia and Herzegovina", "Bosnian"],
  ["BW", "Botswana", "Botswanan"],
  ["BR", "Brazil", "Brazilian"],
  ["BN", "Brunei", "Bruneian"],
  ["BG", "Bulgaria", "Bulgarian"],
  ["BF", "Burkina Faso", "Burkinabè"],
  ["BI", "Burundi", "Burundian"],
  ["CV", "Cabo Verde", "Cabo Verdean", ["Cape Verde"]],
  ["KH", "Cambodia", "Cambodian"],
  ["CM", "Cameroon", "Cameroonian"],
  ["CA", "Canada", "Canadian"],
  ["CF", "Central African Republic", "Central African"],
  ["TD", "Chad", "Chadian"],
  ["CL", "Chile", "Chilean"],
  ["CN", "China", "Chinese"],
  ["CO", "Colombia", "Colombian"],
  ["KM", "Comoros", "Comorian"],
  ["CR", "Costa Rica", "Costa Rican"],
  ["CI", "Côte d'Ivoire", "Ivorian", ["Ivory Coast"]],
  ["HR", "Croatia", "Croatian"],
  ["CU", "Cuba", "Cuban"],
  ["CY", "Cyprus", "Cypriot"],
  ["CZ", "Czechia", "Czech", ["Czech Republic"]],
  ["CD", "Democratic Republic of the Congo", "Congolese", ["DR Congo", "DRC", "Congo-Kinshasa"]],
  ["DK", "Denmark", "Danish"],
  ["DJ", "Djibouti", "Djiboutian"],
  ["DM", "Dominica", "Dominican"],
  ["DO", "Dominican Republic", "Dominican"],
  ["EC", "Ecuador", "Ecuadorian"],
  ["EG", "Egypt", "Egyptian"],
  ["SV", "El Salvador", "Salvadoran"],
  ["GQ", "Equatorial Guinea", "Equatorial Guinean"],
  ["ER", "Eritrea", "Eritrean"],
  ["EE", "Estonia", "Estonian"],
  ["SZ", "Eswatini", "Swazi", ["Swaziland"]],
  ["ET", "Ethiopia", "Ethiopian"],
  ["FJ", "Fiji", "Fijian"],
  ["FI", "Finland", "Finnish"],
  ["FR", "France", "French"],
  ["GA", "Gabon", "Gabonese"],
  ["GM", "Gambia", "Gambian"],
  ["GE", "Georgia", "Georgian"],
  ["DE", "Germany", "German"],
  ["GH", "Ghana", "Ghanaian"],
  ["GR", "Greece", "Greek"],
  ["GD", "Grenada", "Grenadian"],
  ["GT", "Guatemala", "Guatemalan"],
  ["GN", "Guinea", "Guinean"],
  ["GW", "Guinea-Bissau", "Bissau-Guinean"],
  ["GY", "Guyana", "Guyanese"],
  ["HT", "Haiti", "Haitian"],
  ["HN", "Honduras", "Honduran"],
  ["HU", "Hungary", "Hungarian"],
  ["IS", "Iceland", "Icelandic"],
  ["IN", "India", "Indian"],
  ["ID", "Indonesia", "Indonesian"],
  ["IR", "Iran", "Iranian"],
  ["IQ", "Iraq", "Iraqi"],
  ["IE", "Ireland", "Irish"],
  ["IL", "Israel", "Israeli"],
  ["IT", "Italy", "Italian"],
  ["JM", "Jamaica", "Jamaican"],
  ["JP", "Japan", "Japanese"],
  ["JO", "Jordan", "Jordanian"],
  ["KZ", "Kazakhstan", "Kazakhstani"],
  ["KE", "Kenya", "Kenyan"],
  ["KI", "Kiribati", "I-Kiribati"],
  ["XK", "Kosovo", "Kosovar"],
  ["KW", "Kuwait", "Kuwaiti"],
  ["KG", "Kyrgyzstan", "Kyrgyz"],
  ["LA", "Laos", "Lao"],
  ["LV", "Latvia", "Latvian"],
  ["LB", "Lebanon", "Lebanese"],
  ["LS", "Lesotho", "Basotho"],
  ["LR", "Liberia", "Liberian"],
  ["LY", "Libya", "Libyan"],
  ["LI", "Liechtenstein", "Liechtensteiner"],
  ["LT", "Lithuania", "Lithuanian"],
  ["LU", "Luxembourg", "Luxembourgish"],
  ["MG", "Madagascar", "Malagasy"],
  ["MW", "Malawi", "Malawian"],
  ["MY", "Malaysia", "Malaysian"],
  ["MV", "Maldives", "Maldivian"],
  ["ML", "Mali", "Malian"],
  ["MT", "Malta", "Maltese"],
  ["MH", "Marshall Islands", "Marshallese"],
  ["MR", "Mauritania", "Mauritanian"],
  ["MU", "Mauritius", "Mauritian"],
  ["MX", "Mexico", "Mexican"],
  ["FM", "Micronesia", "Micronesian"],
  ["MD", "Moldova", "Moldovan"],
  ["MC", "Monaco", "Monégasque"],
  ["MN", "Mongolia", "Mongolian"],
  ["ME", "Montenegro", "Montenegrin"],
  ["MA", "Morocco", "Moroccan"],
  ["MZ", "Mozambique", "Mozambican"],
  ["MM", "Myanmar", "Burmese", ["Burma"]],
  ["NA", "Namibia", "Namibian"],
  ["NR", "Nauru", "Nauruan"],
  ["NP", "Nepal", "Nepali"],
  ["NL", "Netherlands", "Dutch", ["Holland"]],
  ["NZ", "New Zealand", "New Zealander"],
  ["NI", "Nicaragua", "Nicaraguan"],
  ["NE", "Niger", "Nigerien"],
  ["NG", "Nigeria", "Nigerian"],
  ["KP", "North Korea", "North Korean"],
  ["MK", "North Macedonia", "Macedonian", ["Macedonia"]],
  ["NO", "Norway", "Norwegian"],
  ["OM", "Oman", "Omani"],
  ["PK", "Pakistan", "Pakistani"],
  ["PW", "Palau", "Palauan"],
  ["PS", "Palestine", "Palestinian"],
  ["PA", "Panama", "Panamanian"],
  ["PG", "Papua New Guinea", "Papua New Guinean"],
  ["PY", "Paraguay", "Paraguayan"],
  ["PE", "Peru", "Peruvian"],
  ["PH", "Philippines", "Filipino"],
  ["PL", "Poland", "Polish"],
  ["PT", "Portugal", "Portuguese"],
  ["QA", "Qatar", "Qatari"],
  ["CG", "Republic of the Congo", "Congolese", ["Congo", "Congo-Brazzaville"]],
  ["RO", "Romania", "Romanian"],
  ["RU", "Russia", "Russian"],
  ["RW", "Rwanda", "Rwandan"],
  ["KN", "Saint Kitts and Nevis", "Kittitian"],
  ["LC", "Saint Lucia", "Saint Lucian"],
  ["VC", "Saint Vincent and the Grenadines", "Vincentian"],
  ["WS", "Samoa", "Samoan"],
  ["SM", "San Marino", "Sammarinese"],
  ["ST", "São Tomé and Príncipe", "São Toméan", ["Sao Tome"]],
  ["SA", "Saudi Arabia", "Saudi"],
  ["SN", "Senegal", "Senegalese"],
  ["RS", "Serbia", "Serbian"],
  ["SC", "Seychelles", "Seychellois"],
  ["SL", "Sierra Leone", "Sierra Leonean"],
  ["SG", "Singapore", "Singaporean"],
  ["SK", "Slovakia", "Slovak"],
  ["SI", "Slovenia", "Slovenian"],
  ["SB", "Solomon Islands", "Solomon Islander"],
  ["SO", "Somalia", "Somali"],
  ["ZA", "South Africa", "South African"],
  ["KR", "South Korea", "South Korean", ["Korea, South", "Korea"]],
  ["SS", "South Sudan", "South Sudanese"],
  ["ES", "Spain", "Spanish"],
  ["LK", "Sri Lanka", "Sri Lankan"],
  ["SD", "Sudan", "Sudanese"],
  ["SR", "Suriname", "Surinamese"],
  ["SE", "Sweden", "Swedish"],
  ["CH", "Switzerland", "Swiss"],
  ["SY", "Syria", "Syrian"],
  ["TW", "Taiwan", "Taiwanese"],
  ["TJ", "Tajikistan", "Tajik"],
  ["TZ", "Tanzania", "Tanzanian"],
  ["TH", "Thailand", "Thai"],
  ["TL", "Timor-Leste", "Timorese", ["East Timor"]],
  ["TG", "Togo", "Togolese"],
  ["TO", "Tonga", "Tongan"],
  ["TT", "Trinidad and Tobago", "Trinidadian"],
  ["TN", "Tunisia", "Tunisian"],
  ["TR", "Türkiye", "Turkish", ["Turkey"]],
  ["TM", "Turkmenistan", "Turkmen"],
  ["TV", "Tuvalu", "Tuvaluan"],
  ["UG", "Uganda", "Ugandan"],
  ["UA", "Ukraine", "Ukrainian"],
  ["AE", "United Arab Emirates", "Emirati", ["UAE"]],
  ["GB", "United Kingdom", "British", ["UK", "Great Britain", "England", "Scotland", "Wales"]],
  ["US", "United States", "American", ["USA", "United States of America"]],
  ["UY", "Uruguay", "Uruguayan"],
  ["UZ", "Uzbekistan", "Uzbek"],
  ["VU", "Vanuatu", "Ni-Vanuatu"],
  ["VA", "Vatican City", "Vatican", ["Holy See"]],
  ["VE", "Venezuela", "Venezuelan"],
  ["VN", "Vietnam", "Vietnamese"],
  ["YE", "Yemen", "Yemeni"],
  ["ZM", "Zambia", "Zambian"],
  ["ZW", "Zimbabwe", "Zimbabwean"]
];

export const COUNTRY_OPTIONS: CountryOption[] = ROWS.map(([code, name, demonym, aliases]) => ({
  code,
  name,
  demonym,
  flag: flagOf(code),
  ...(aliases ? { aliases } : {})
}));

// Search across names, demonyms, and historical aliases.
export function searchCountries(query: string): CountryOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return COUNTRY_OPTIONS;
  return COUNTRY_OPTIONS.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      c.demonym.toLowerCase().includes(q) ||
      (c.aliases || []).some(a => a.toLowerCase().includes(q))
  );
}

// ---------------------------------------------------------------------------
// Legacy compatibility
//
// Profiles store nationalities as "Name FLAG" strings joined with ", "
// (e.g. "Iran 🇮🇷, United Arab Emirates 🇦🇪"). The prototype dataset used a
// few names that differ from the canonical list; this mapping keeps stored
// values working and lets the database migrate them in place.
// ---------------------------------------------------------------------------

export const LEGACY_COUNTRY_NAME_MAP: Record<string, string> = {
  "Korea, South": "South Korea",
  "Turkey": "Türkiye",
  "Congo": "Republic of the Congo"
};

const BY_NAME = new Map(COUNTRY_OPTIONS.map(c => [c.name.toLowerCase(), c]));

/** "Name FLAG" display string used across profiles. */
export function formatNationality(country: CountryOption): string {
  return `${country.name} ${country.flag}`;
}

// Splits a stored nationality string. Entries end with a flag emoji, so we
// split on commas that FOLLOW a regional-indicator pair — names containing
// commas (legacy "Korea, South") stay intact.
export function splitStoredNationalities(stored: string): string[] {
  if (!stored) return [];
  try {
    return stored
      .split(/(?<=\p{Regional_Indicator}\p{Regional_Indicator})\s*,\s*/u)
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return stored.split(",").map(s => s.trim()).filter(Boolean);
  }
}

// Normalizes one stored "Name FLAG" entry to its canonical form. Unknown
// values are returned unchanged so nothing ever breaks.
export function normalizeNationalityEntry(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed) return trimmed;

  // Separate trailing flag emoji (if any) from the name
  const match = trimmed.match(/^(.*?)[\s ]*((?:\p{Regional_Indicator}\p{Regional_Indicator})?)$/u);
  const rawName = (match ? match[1] : trimmed).trim();

  const canonicalName = LEGACY_COUNTRY_NAME_MAP[rawName] || rawName;
  const country = BY_NAME.get(canonicalName.toLowerCase());
  if (!country) return trimmed;
  return formatNationality(country);
}

/** Normalizes a full stored nationality string ("A 🇦🇩, B 🇧🇪"). */
export function normalizeStoredNationalities(stored: string): string {
  const parts = splitStoredNationalities(stored);
  if (parts.length === 0) return stored;
  return parts.map(normalizeNationalityEntry).join(", ");
}
