/** Les noms des pays et des langues en français, fournis par le navigateur (aucune table à maintenir). */
const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
const languageNames = new Intl.DisplayNames(['fr'], { type: 'language' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "JP" → "Japon" */
export const countryName = (code: string): string => regionNames.of(code) ?? code;

/** "en" → "Anglais" */
export const languageName = (code: string): string => capitalize(languageNames.of(code) ?? code);

/** Les marchés habituels d'un négoce en vin, triés par nom. L'API accepte tous les codes ISO. */
export const COMMON_COUNTRIES = [
  'FR',
  'BE',
  'LU',
  'CH',
  'DE',
  'NL',
  'GB',
  'IE',
  'DK',
  'SE',
  'NO',
  'FI',
  'PL',
  'CZ',
  'AT',
  'IT',
  'ES',
  'PT',
  'US',
  'CA',
  'MX',
  'BR',
  'JP',
  'CN',
  'HK',
  'TW',
  'KR',
  'SG',
  'TH',
  'VN',
  'AU',
  'NZ',
  'AE',
  'IL',
  'ZA',
  'NG',
]
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

export const COMMON_LANGUAGES = [
  'fr',
  'en',
  'de',
  'nl',
  'it',
  'es',
  'pt',
  'da',
  'sv',
  'pl',
  'ja',
  'zh',
  'ko',
]
  .map((code) => ({ code, name: languageName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
