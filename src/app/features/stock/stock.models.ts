/** Miroir des DTO de l'API (package stock). */

export type StockStatus = 'OK' | 'BELOW_THRESHOLD' | 'OUT_OF_STOCK';

/** GET /api/stock/overview : une ligne par article, tous lots confondus. */
export interface StockOverviewRow {
  articleId: string;
  articleCode: string;
  articleLabel: string;
  categoryCode: string;
  categoryLabel: string;
  unitCode: string;
  lotTracked: boolean;
  quantity: number;
  alertThreshold: number | null;
  lotsInStock: number;
  status: StockStatus;
  lastMovementAt: string | null; // date ISO-8601
  active: boolean;
}

/** GET /api/stock/balances : un solde par article et par lot. */
export interface BalanceRow {
  articleId: string;
  articleCode: string;
  articleLabel: string;
  unitCode: string;
  lotId: string | null;
  lotNumber: string | null;
  quantity: number;
  updatedAt: string;
}

export type MovementType =
  'RECEPTION' | 'CONSUMPTION' | 'LOSS' | 'ADJUSTMENT' | 'PRODUCTION' | 'SHIPMENT' | 'INVENTORY';

/** Le libellé affiché pour chaque type de mouvement. */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  RECEPTION: 'Réception',
  CONSUMPTION: 'Consommation',
  LOSS: 'Perte',
  ADJUSTMENT: 'Ajustement',
  PRODUCTION: 'Production',
  SHIPMENT: 'Expédition',
  INVENTORY: 'Inventaire',
};

/** GET /api/stock/movements : un mouvement (quantité signée : + entrée, − sortie). */
export interface MovementRow {
  id: string;
  articleId: string;
  articleCode: string;
  unitCode: string;
  lotId: string | null;
  lotNumber: string | null;
  type: MovementType;
  quantity: number;
  occurredAt: string;
  reference: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}
