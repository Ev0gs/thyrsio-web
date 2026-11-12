/** Miroir des DTO de l'API (package cuverie). Les volumes sont en hectolitres. */

export type WineColor = 'RED' | 'WHITE' | 'ROSE';

export const WINE_COLOR_LABELS: Record<WineColor, string> = {
  RED: 'Rouge',
  WHITE: 'Blanc',
  ROSE: 'Rosé',
};

export const WINE_COLORS = Object.keys(WINE_COLOR_LABELS) as WineColor[];

/** Le statut choisi par l'utilisateur. Vide / occupée se calcule (voir TankState). */
export type TankStatus = 'IN_SERVICE' | 'CLEANING' | 'OUT_OF_SERVICE';

export const TANK_STATUS_LABELS: Record<TankStatus, string> = {
  IN_SERVICE: 'En service',
  CLEANING: 'En nettoyage',
  OUT_OF_SERVICE: 'Hors service',
};

/** Ce que l'écran affiche : calculé par l'API à partir du statut et du volume. */
export type TankState = 'EMPTY' | 'IN_USE' | 'CLEANING' | 'OUT_OF_SERVICE';

export const TANK_STATE_LABELS: Record<TankState, string> = {
  EMPTY: 'Vide',
  IN_USE: 'Occupée',
  CLEANING: 'En nettoyage',
  OUT_OF_SERVICE: 'Hors service',
};

/** Ce qu'on affiche d'un lot à côté d'une cuve ou d'un mouvement. */
export interface WineLotSummary {
  id: string;
  code: string;
  appellation: string;
  color: WineColor;
  vintage: number | null;
}

/** GET /api/cuverie/tanks */
export interface Tank {
  id: string;
  code: string;
  label: string | null;
  capacityHl: number;
  volumeHl: number;
  freeSpaceHl: number;
  status: TankStatus;
  state: TankState;
  wineLot: WineLotSummary | null; // null : cuve vide
  active: boolean;
  updatedAt: string;
}

export type TankMovementType =
  'RECEPTION' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'LOSS' | 'ADJUSTMENT' | 'BOTTLING';

export const TANK_MOVEMENT_TYPE_LABELS: Record<TankMovementType, string> = {
  RECEPTION: 'Réception',
  TRANSFER_OUT: 'Transfert sortant',
  TRANSFER_IN: 'Transfert entrant',
  LOSS: 'Perte',
  ADJUSTMENT: 'Jaugeage',
  BOTTLING: 'Mise en bouteille',
};

/** GET /api/cuverie/movements : volume signé (+ entrée dans la cuve, − sortie). */
export interface TankMovement {
  id: string;
  tankId: string;
  tankCode: string;
  wineLot: WineLotSummary;
  type: TankMovementType;
  volumeHl: number;
  transferId: string | null;
  occurredAt: string;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

/** GET /api/cuverie/wine-lots : une ligne de la liste. */
export interface WineLotRow {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string | null;
  appellation: string;
  color: WineColor;
  vintage: number | null;
  alcohol: number | null;
  receivedAt: string;
  volumeHl: number; // ce qui reste en cuve aujourd'hui
  tankCount: number;
}

/** Une cuve qui contient le lot, et combien. */
export interface TankContent {
  tankId: string;
  tankCode: string;
  volumeHl: number;
  capacityHl: number;
}

/** GET /api/cuverie/wine-lots/{id} : la fiche complète. */
export interface WineLot {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string | null;
  appellation: string;
  color: WineColor;
  vintage: number | null;
  alcohol: number | null;
  supplierLotNumber: string | null;
  daeNumber: string | null;
  pricePerHl: number | null;
  receivedAt: string;
  notes: string | null;
  volumeHl: number;
  tanks: TankContent[];
  createdBy: string;
  createdAt: string;
}

/** GET /api/cuverie/wine-lots/{id}/analyses */
export interface WineAnalysis {
  id: string;
  wineLotId: string;
  tankId: string | null;
  tankCode: string | null;
  analyzedOn: string; // AAAA-MM-JJ
  alcohol: number | null;
  freeSo2: number | null;
  totalSo2: number | null;
  totalAcidity: number | null;
  volatileAcidity: number | null;
  laboratory: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

// ---------- Les requêtes ----------

export interface CreateTankRequest {
  code: string;
  label: string | null;
  capacityHl: number;
}

export interface UpdateTankRequest {
  label: string | null;
  capacityHl: number;
}

export interface TankFill {
  tankId: string;
  volumeHl: number;
}

export interface ReceptionRequest {
  supplierId: string;
  appellation: string;
  color: WineColor;
  vintage: number | null;
  alcohol: number | null;
  supplierLotNumber: string | null;
  daeNumber: string | null;
  pricePerHl: number | null;
  receivedAt: string | null; // null : maintenant
  notes: string | null;
  fills: TankFill[];
}

export interface TransferRequest {
  sourceTankId: string;
  destinationTankId: string;
  volumeHl: number | null; // null avec emptySource
  lossHl: number | null;
  emptySource: boolean;
  occurredAt: string | null;
  notes: string | null;
}

export interface LossRequest {
  volumeHl: number;
  occurredAt: string | null;
  reference: string | null;
  notes: string | null;
}

export interface MeasureRequest {
  measuredHl: number;
  wineLotId: string | null; // seulement pour une cuve vide dans l'application
  occurredAt: string | null;
  notes: string | null;
}

export interface UpdateWineLotRequest {
  appellation: string;
  color: WineColor;
  vintage: number | null;
  alcohol: number | null;
  supplierLotNumber: string | null;
  daeNumber: string | null;
  pricePerHl: number | null;
  notes: string | null;
}

export interface AnalysisRequest {
  tankId: string | null;
  analyzedOn: string;
  alcohol: number | null;
  freeSo2: number | null;
  totalSo2: number | null;
  totalAcidity: number | null;
  volatileAcidity: number | null;
  laboratory: string | null;
  notes: string | null;
}

// ---------- Petites fonctions d'affichage ----------

/** La part de la cuve remplie, de 0 à 100. */
export function fillPercent(volumeHl: number, capacityHl: number): number {
  return capacityHl > 0 ? Math.min(100, Math.max(0, (volumeHl / capacityHl) * 100)) : 0;
}

/** "Bordeaux Supérieur 2023" ; "Bordeaux" pour un vin non millésimé. */
export function describeWine(lot: { appellation: string; vintage: number | null }): string {
  return lot.vintage ? `${lot.appellation} ${lot.vintage}` : lot.appellation;
}

/** Les volumes arrivent en nombres décimaux : on arrondit au litre pour éviter 19.599999. */
export function roundHl(value: number): number {
  return Math.round(value * 100) / 100;
}
