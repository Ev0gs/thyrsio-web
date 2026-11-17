/** Les registres tenus dans le cahier de chai numérique (RegisterBook côté API). */
export type RegisterBook =
  'ENTREES_VRAC' | 'MOUVEMENTS' | 'PRODUITS_OENOLOGIQUES' | 'COUPAGES' | 'CONDITIONNEMENT';

export const REGISTER_BOOK_LABELS: Record<RegisterBook, string> = {
  ENTREES_VRAC: 'Entrées de vin en vrac',
  MOUVEMENTS: 'Mouvements de vin',
  PRODUITS_OENOLOGIQUES: 'Produits œnologiques',
  COUPAGES: 'Coupages et déclassements',
  CONDITIONNEMENT: 'Conditionnement',
};

/** Le libellé court de chaque type d'opération ; un type inconnu s'affiche tel quel. */
export const REGISTER_KIND_LABELS: Record<string, string> = {
  RECEPTION: 'Réception',
  TRANSFER: 'Transfert',
  LOSS: 'Perte',
  MEASURE: 'Jaugeage',
  BOTTLING_DRAW: 'Tirage pour mise',
  BOTTLING: 'Mise en bouteille',
  CORRECTION: 'Contre-écriture',
};

export const kindLabel = (kind: string): string => REGISTER_KIND_LABELS[kind] ?? kind;

/** Une écriture du registre, telle qu'elle a été scellée. */
export interface RegisterEntry {
  id: string;
  sequenceNo: number;
  book: RegisterBook;
  bookLabel: string;
  kind: string;
  operationAt: string;
  recordedAt: string;
  recordedByName: string | null;
  wineLotId: string | null;
  wineLotCode: string | null;
  denomination: string | null;
  tanks: string | null;
  volumeHl: number | null;
  reference: string | null;
  summary: string;
  /** Les colonnes propres au registre (cuves remplies, DAE, soldes…). */
  data: Record<string, unknown>;
  correctsEntryId: string | null;
  late: boolean;
  hash: string;
}

/** GET /api/registre/verify */
export interface RegisterVerification {
  valid: boolean;
  verifiedEntries: number;
  brokenAt: number | null;
  problem: string | null;
  lastHash: string | null;
}

/** La fiche de l'entreprise : la page de garde des registres. */
export interface CompanySettings {
  legalName: string | null;
  exciseNumber: string | null;
  siret: string | null;
  vatNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  registerStartDate: string | null;
  updatedAt: string;
}

export type CompanySettingsRequest = Omit<CompanySettings, 'updatedAt'>;

/** Les libellés des colonnes de data, pour le détail d'une écriture. */
const DATA_LABELS: Record<string, string> = {
  dae: 'DAE / DSA',
  supplier: 'Fournisseur',
  supplierLotNumber: 'Lot fournisseur',
  appellation: 'Appellation',
  color: 'Couleur',
  vintage: 'Millésime',
  alcohol: 'Degré (% vol.)',
  fills: 'Cuves remplies',
  from: 'Cuve de départ',
  to: "Cuve d'arrivée",
  tank: 'Cuve',
  volumeHl: 'Volume (hl)',
  lossHl: 'Perte (hl)',
  sourceRemainingHl: 'Reste en cuve de départ (hl)',
  destinationVolumeHl: "Volume en cuve d'arrivée (hl)",
  tankVolumeHl: 'Reste en cuve (hl)',
  recordedHl: 'Volume enregistré (hl)',
  measuredHl: 'Volume mesuré (hl)',
  deltaHl: 'Écart (hl)',
  lotBalanceHl: 'Solde du lot (hl)',
  notes: 'Notes',
  bottling: 'Mise',
  product: 'Produit',
  productCode: 'Code produit',
  wine: 'Vin',
  location: 'Lieu',
  volumeToBottleHl: 'Volume prévu (hl)',
  containers: 'Contenants',
  bottledHl: 'Volume conditionné (hl)',
  brokenBottles: 'Casse',
  bottler: 'Embouteilleur',
  lotNumber: 'N° de lot',
  changes: 'Modifications',
};

const COLOR_LABELS: Record<string, string> = { RED: 'Rouge', WHITE: 'Blanc', ROSE: 'Rosé' };

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (key === 'color' && typeof value === 'string') {
    return COLOR_LABELS[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue('', item)).join(' ; ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Une modification : { before, after }
    if ('before' in record && 'after' in record) {
      return `${formatValue('', record['before'])} → ${formatValue('', record['after'])}`;
    }
    // Une cuve remplie : { tank, volumeHl }
    if ('tank' in record && 'volumeHl' in record) {
      return `${record['tank']} : ${record['volumeHl']} hl`;
    }
    // Un contenant : { volumeCl, count }
    if ('volumeCl' in record && 'count' in record) {
      return `${record['count']} × ${record['volumeCl']} cl`;
    }
    return Object.entries(record)
      .map(([k, v]) => `${DATA_LABELS[k] ?? k} : ${formatValue(k, v)}`)
      .join(', ');
  }
  return String(value);
}

/** Les colonnes d'une écriture, lisibles, dans l'ordre où l'API les a scellées (clés triées). */
export function describeData(data: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(data ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({ label: DATA_LABELS[key] ?? key, value: formatValue(key, value) }));
}
