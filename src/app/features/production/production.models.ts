/** Miroir des DTO de l'API (package production). */
import { WineLotSummary } from '../cuverie/cuverie.models';
import { AppellationRow } from '../referentiel/referentiel.models';

export type BottlingStatus = 'PLANNED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';
export type ProductionStatus = 'PLANNED' | 'CLOSED' | 'CANCELLED';

/** Chez nous (le vin sort d'une de nos cuves) ou chez le producteur (il ne passe pas par nos cuves). */
export type BottlingLocation = 'ON_SITE' | 'AT_PRODUCER';

export const BOTTLING_LOCATION_LABELS: Record<BottlingLocation, string> = {
  ON_SITE: 'Chez nous',
  AT_PRODUCER: 'Chez le producteur',
};

/** Le moment d'une production sur la journée ; sur plusieurs jours, c'est toujours la journée entière. */
export type ProductionSlot = 'MORNING' | 'AFTERNOON' | 'FULL_DAY';

export const PRODUCTION_SLOT_LABELS: Record<ProductionSlot, string> = {
  FULL_DAY: 'Journée',
  MORNING: 'Matin',
  AFTERNOON: 'Après-midi',
};

/** Une commande servie par une production : « CC-26-004 · Tokyo Wine Import · 3 600 bt ». */
export interface AllocationLine {
  orderLineId: string;
  orderId: string;
  orderCode: string | null;
  clientName: string | null;
  quantity: number;
}

/**
 * Une matière prévue. Pour une production planifiée : le stock, ce que les productions précédentes
 * réservent déjà, et ce qui manque (null une fois la production clôturée ou annulée).
 */
export interface MaterialLine {
  articleId: string;
  articleCode: string;
  articleLabel: string;
  categoryLabel: string;
  unitCode: string;
  plannedQuantity: number;
  stockQuantity: number | null;
  reservedBefore: number | null;
  shortageQuantity: number | null;
}

export interface ConsumptionLine {
  articleId: string;
  articleCode: string;
  articleLabel: string;
  unitCode: string;
  quantity: number;
}

/** Une production d'une mise : un produit fini, son numéro de lot, son vin, ses matières. */
export interface Production {
  id: string;
  status: ProductionStatus;
  startDate: string; // AAAA-MM-JJ
  endDate: string;
  slot: ProductionSlot;
  finishedArticleId: string;
  finishedArticleCode: string;
  finishedArticleLabel: string;
  plannedBottles: number;
  bottleVolumeCl: number;
  wineNeededHl: number;
  sourceTankId: string | null;
  sourceTankCode: string | null;
  tankVolumeHl: number | null;
  wineLot: WineLotSummary | null; // le vin actuellement dans la cuve d'origine
  wineDescription: string | null;
  appellationId: string | null;
  appellationCode: string | null;
  appellationName: string | null;
  vintage: number | null;
  /** Attribué dès la planification : LBX2401. */
  lotNumber: string | null;
  materials: MaterialLine[];
  /** Les commandes que la production sert ; le reste de ses bouteilles va au stock. */
  allocations: AllocationLine[];
  shortageCount: number;
  /** Planifiée, avec des manquants, et elle commence dans moins de 10 jours. */
  alert: boolean;
  producedBottles: number | null;
  brokenBottles: number | null;
  wineUsedHl: number | null;
  consumptions: ConsumptionLine[];
  closedAt: string | null;
  closedBy: string | null;
}

/** GET /api/production/bottlings(/{id}) : une mise et ses productions, dans l'ordre de la journée. */
export interface Bottling {
  id: string;
  code: string;
  status: BottlingStatus;
  location: BottlingLocation;
  contractor: string | null;
  startDate: string;
  endDate: string;
  notes: string | null;
  plannedBottles: number;
  producedBottles: number;
  shortageCount: number;
  alert: boolean;
  productions: Production[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Une appellation et son sigle, qui entre dans les numéros de lot (BX → LBX2401). */
export type Appellation = AppellationRow;

// ---------- Les requêtes ----------

export interface MaterialRequest {
  articleId: string;
  plannedQuantity: number;
}

export interface AllocationRequest {
  orderLineId: string;
  quantity: number;
}

export interface ProductionRequest {
  id: string | null;
  startDate: string;
  endDate: string | null; // null : un seul jour
  slot: ProductionSlot;
  finishedArticleId: string;
  plannedBottles: number;
  bottleVolumeCl: number;
  sourceTankId: string | null;
  wineDescription: string | null;
  appellationId: string;
  vintage: number | null; // null : non millésimé
  materials: MaterialRequest[];
  allocations: AllocationRequest[];
}

export interface BottlingRequest {
  location: BottlingLocation;
  contractor: string | null;
  notes: string | null;
  productions: ProductionRequest[];
}

/** Une matière sèche consommée : pas de lot, les matières sèches n'en ont pas. */
export interface ConsumptionRequest {
  articleId: string;
  quantity: number;
}

export interface CloseProductionRequest {
  producedBottles: number;
  brokenBottles: number | null;
  wineUsedHl: number | null; // chez le producteur : null
  consumptions: ConsumptionRequest[];
}

// ---------- L'état affiché ----------

/** Ce que voit l'utilisateur : une production planifiée est « prête » ou « en manque ». */
export type BottlingDisplayState = 'READY' | 'SHORT' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED';

export function displayState(item: {
  status: BottlingStatus | ProductionStatus;
  shortageCount: number;
}): BottlingDisplayState {
  switch (item.status) {
    case 'CLOSED':
      return 'CLOSED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'IN_PROGRESS':
      return item.shortageCount > 0 ? 'SHORT' : 'IN_PROGRESS';
    default:
      return item.shortageCount > 0 ? 'SHORT' : 'READY';
  }
}

/** Les productions qui comptent : toutes sauf les annulées. */
export const activeProductions = (bottling: Bottling): Production[] =>
  bottling.productions.filter((p) => p.status !== 'CANCELLED');

/** Ce que fait la mise, pour une liste : le produit, ou « Bordeaux… + Côtes de Bourg… ». */
export function bottlingTitle(bottling: Bottling): string {
  const labels = [...new Set(activeProductions(bottling).map((p) => p.finishedArticleLabel))];
  if (labels.length === 0) {
    return bottling.productions[0]?.finishedArticleLabel ?? bottling.code;
  }
  return labels.join(' + ');
}

/** Le titre de la fiche : le produit, ou « 2 productions dans la journée » (elles sont détaillées dessous). */
export function bottlingHeading(bottling: Bottling): string {
  const productions = activeProductions(bottling);
  if (productions.length <= 1) {
    return bottlingTitle(bottling);
  }
  const oneDay = bottling.startDate === bottling.endDate;
  return `${productions.length} productions ${oneDay ? 'dans la journée' : 'sur ' + daySpan(bottling) + ' jours'}`;
}

const daySpan = (bottling: Bottling) =>
  Math.round(
    (parseDay(bottling.endDate).getTime() - parseDay(bottling.startDate).getTime()) / 86_400_000,
  ) + 1;

/** Où se fait la mise : les cuves tirées, ou chez le producteur. */
export function bottlingSource(bottling: Bottling): string {
  if (bottling.location === 'AT_PRODUCER') {
    return 'Chez le producteur';
  }
  const tanks = [
    ...new Set(
      activeProductions(bottling)
        .map((p) => p.sourceTankCode)
        .filter((code): code is string => !!code),
    ),
  ];
  return tanks.length > 0 ? `Cuve ${tanks.join(', ')}` : 'Chez nous';
}

/**
 * Le début du numéro de lot, tel que l'API le composera : L + sigle + millésime (NM sans millésime).
 * L'API ajoute le numéro d'ordre à l'enregistrement.
 */
export function lotPrefix(appellationCode: string, vintage: number | null): string {
  const year = vintage === null ? 'NM' : String(vintage % 100).padStart(2, '0');
  return `L${appellationCode}${year}`;
}

/** Ordre de la journée : le matin avant l'après-midi. */
export const SLOT_RANK: Record<ProductionSlot, number> = { MORNING: 0, FULL_DAY: 0, AFTERNOON: 1 };

/** Sans accents ni casse : « Côtes de Bourg » et « cotes de bourg » se valent. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * L'appellation d'un vin en cuve : la même, ou la plus longue qui l'annonce
 * (« Bordeaux Blanc » → Bordeaux ; « Bordeaux Supérieur » → Bordeaux Supérieur s'il existe).
 */
export function matchAppellation(
  wineAppellation: string,
  appellations: Appellation[],
): Appellation | null {
  const wine = normalize(wineAppellation);
  const exact = appellations.find((a) => normalize(a.name) === wine);
  if (exact) {
    return exact;
  }
  return (
    appellations
      .filter((a) => wine.startsWith(normalize(a.name) + ' '))
      .sort((a, b) => b.name.length - a.name.length)[0] ?? null
  );
}

// ---------- Les dates du planning (AAAA-MM-JJ, en heure locale) ----------

const pad = (value: number) => String(value).padStart(2, '0');

/** Date → "2026-11-09", sans passer par l'UTC (toISOString décalerait d'un jour la nuit). */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2026-11-09" → minuit, heure locale. */
export function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

export function addDays(day: string, days: number): string {
  const date = parseDay(day);
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

/** Le lundi de la semaine qui contient ce jour. */
export function mondayOf(day: string): string {
  const date = parseDay(day);
  const offset = (date.getDay() + 6) % 7; // lundi = 0, dimanche = 6
  date.setDate(date.getDate() - offset);
  return isoDay(date);
}

/** Le numéro de semaine ISO (celui des calendriers français). */
export function isoWeekNumber(day: string): number {
  const date = parseDay(day);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7)); // le jeudi de la semaine
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

/** Les bouteilles à partir du vin : 6 000 × 75 cl = 45 hl. */
export function wineNeededHl(bottles: number, volumeCl: number): number {
  return Math.round(bottles * volumeCl) / 10000;
}
