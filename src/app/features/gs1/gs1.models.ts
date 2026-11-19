/** Miroir des DTO de l'API (package gs1) : les préfixes GS1 et les gencodes des produits finis. */

export type GtinPackaging = 'BOTTLE' | 'CARTON' | 'WOODEN_CASE' | 'OTHER';
export type GtinStatus = 'ACTIVE' | 'RETIRED';

export const PACKAGING_LABELS: Record<GtinPackaging, string> = {
  BOTTLE: 'Bouteille',
  CARTON: 'Carton',
  WOODEN_CASE: 'Caisse bois',
  OTHER: 'Autre',
};

export interface Gs1Prefix {
  id: string;
  prefix: string;
  label: string | null;
  active: boolean;
  capacity: number;
  used: number;
  remaining: number;
}

export interface Gtin {
  id: string;
  gtin: string;
  prefixId: string | null;
  prefix: string | null;
  finishedArticleId: string | null;
  finishedArticleCode: string | null;
  finishedArticleLabel: string | null;
  packaging: GtinPackaging;
  packagingLabel: string;
  unitsPerPack: number;
  description: string | null;
  status: GtinStatus;
  notes: string | null;
  createdAt: string;
  assignedAt: string | null;
  retiredAt: string | null;
}

export interface GenerateGtinRequest {
  prefixId: string | null;
  finishedArticleId: string;
  packaging: GtinPackaging;
  unitsPerPack: number | null;
  description: string | null;
  notes: string | null;
}

export interface RecordGtinRequest {
  gtin: string;
  finishedArticleId: string | null;
  packaging: GtinPackaging;
  unitsPerPack: number | null;
  description: string | null;
  notes: string | null;
}

/** « Bouteille », « Carton de 6 », « Caisse bois de 6 ». */
export function describePackaging(packaging: GtinPackaging, units: number): string {
  return packaging === 'BOTTLE'
    ? PACKAGING_LABELS.BOTTLE
    : `${PACKAGING_LABELS[packaging]} de ${units}`;
}

/** La clé GS1 : chiffres pondérés 3, 1, 3... depuis la droite, complétés à la dizaine. */
export function checkDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Les séparateurs de saisie retirés : « 3 760123 456784 » → « 3760123456784 ». */
export const normalizeGtin = (input: string) => input.replace(/[\s.-]/g, '');

export function isValidGtin(gtin: string): boolean {
  return /^\d{13}$/.test(gtin) && checkDigit(gtin.slice(0, 12)) === Number(gtin[12]);
}

/** L'EAN-13 tel qu'il est imprimé sous le code-barres : « 3 760123 456784 ». */
export function formatGtin(gtin: string): string {
  return gtin.length === 13 ? `${gtin[0]} ${gtin.slice(1, 7)} ${gtin.slice(7)}` : gtin;
}
