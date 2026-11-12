/** Miroir des DTO de l'API (package production). */
import { WineLotSummary } from '../cuverie/cuverie.models';

export type BottlingStatus = 'PLANNED' | 'CLOSED' | 'CANCELLED';

/** Chez nous (le vin sort d'une de nos cuves) ou chez le producteur (il ne passe pas par nos cuves). */
export type BottlingLocation = 'ON_SITE' | 'AT_PRODUCER';

export const BOTTLING_LOCATION_LABELS: Record<BottlingLocation, string> = {
  ON_SITE: 'Chez nous',
  AT_PRODUCER: 'Chez le producteur',
};

/** GET /api/production/bottlings : une mise dans le planning. */
export interface BottlingRow {
  id: string;
  code: string;
  status: BottlingStatus;
  location: BottlingLocation;
  contractor: string | null;
  startDate: string; // AAAA-MM-JJ
  endDate: string;
  finishedArticleId: string;
  finishedArticleCode: string | null;
  finishedArticleLabel: string | null;
  plannedBottles: number;
  producedBottles: number | null;
  bottleVolumeCl: number;
  wineNeededHl: number;
  sourceTankId: string | null;
  sourceTankCode: string | null;
  wineLot: WineLotSummary | null; // le vin actuellement dans la cuve d'origine
  wineDescription: string | null;
  shortageCount: number;
  /** Planifiée, avec des manquants, et elle commence dans moins de 10 jours. */
  alert: boolean;
  lotNumber: string | null;
}

/**
 * Une matière prévue. Pour une mise planifiée : le stock, ce que les mises précédentes réservent déjà,
 * et ce qui manque (null une fois la mise clôturée ou annulée).
 */
export interface MaterialLine {
  articleId: string;
  articleCode: string;
  articleLabel: string;
  categoryLabel: string;
  unitCode: string;
  lotTracked: boolean;
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
  lotId: string | null;
  lotNumber: string | null;
  quantity: number;
}

/** GET /api/production/bottlings/{id} */
export interface Bottling extends Omit<BottlingRow, 'producedBottles' | 'lotNumber'> {
  tankVolumeHl: number | null;
  notes: string | null;
  materials: MaterialLine[];
  producedBottles: number | null;
  brokenBottles: number | null;
  wineUsedHl: number | null;
  lotNumber: string | null;
  consumptions: ConsumptionLine[];
  closedAt: string | null;
  closedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Les requêtes ----------

export interface MaterialRequest {
  articleId: string;
  plannedQuantity: number;
}

export interface BottlingRequest {
  location: BottlingLocation;
  contractor: string | null;
  startDate: string;
  endDate: string;
  finishedArticleId: string;
  plannedBottles: number;
  bottleVolumeCl: number;
  sourceTankId: string | null;
  wineDescription: string | null;
  notes: string | null;
  materials: MaterialRequest[];
}

export interface ConsumptionRequest {
  articleId: string;
  lotId: string | null;
  quantity: number;
}

export interface CloseBottlingRequest {
  producedBottles: number;
  brokenBottles: number | null;
  wineUsedHl: number | null; // chez le producteur : null
  consumptions: ConsumptionRequest[];
}

// ---------- L'état affiché ----------

/** Ce que voit l'utilisateur : une mise planifiée est « prête » ou « en manque ». */
export type BottlingDisplayState = 'READY' | 'SHORT' | 'CLOSED' | 'CANCELLED';

export function displayState(
  bottling: Pick<BottlingRow, 'status' | 'shortageCount'>,
): BottlingDisplayState {
  switch (bottling.status) {
    case 'CLOSED':
      return 'CLOSED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return bottling.shortageCount > 0 ? 'SHORT' : 'READY';
  }
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
