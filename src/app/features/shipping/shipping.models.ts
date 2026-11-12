/** Miroir des DTO de l'API (package shipping). */
import { GeoLocation } from '../../core/geo';
import { Incoterm } from '../referentiel/referentiel.models';

export type ShipmentStatus = 'DRAFT' | 'SHIPPED' | 'CANCELLED';

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  DRAFT: 'En préparation',
  SHIPPED: 'Partie',
  CANCELLED: 'Annulée',
};

/** GET /api/shipping/shipments */
export interface ShipmentRow {
  id: string;
  code: string;
  status: ShipmentStatus;
  orderId: string;
  orderCode: string | null;
  clientName: string | null;
  clientCountryCode: string | null;
  plannedDate: string;
  shippedAt: string | null;
  carrier: string | null;
  totalBottles: number;
}

export interface ShipmentLine {
  id: string;
  orderLineId: string;
  articleId: string;
  articleCode: string | null;
  articleLabel: string | null;
  lotId: string | null;
  lotNumber: string | null;
  quantity: number;
  orderedQuantity: number;
  remainingQuantity: number;
}

/** GET /api/shipping/shipments/{id} : tout ce qu'il faut pour le bon de livraison. */
export interface Shipment {
  id: string;
  code: string;
  status: ShipmentStatus;
  orderId: string;
  orderCode: string;
  customerReference: string | null;
  incoterm: Incoterm | null;
  clientId: string;
  clientCode: string;
  clientName: string;
  clientAddress: string;
  clientVatNumber: string | null;
  clientExciseNumber: string | null;
  clientLanguage: string;
  /** Une ligne par élément ; figée au départ. */
  deliveryAddressText: string;
  /** L'adresse livrée (ou le siège du client) sur la carte, si elle est connue. */
  deliveryLocation: GeoLocation | null;
  plannedDate: string;
  carrier: string | null;
  transportReference: string | null;
  notes: string | null;
  lines: ShipmentLine[];
  totalBottles: number;
  shippedAt: string | null;
  shippedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentLineRequest {
  orderLineId: string;
  lotId: string;
  quantity: number;
}

export interface ShipmentRequest {
  orderId: string | null; // création seulement
  plannedDate: string;
  carrier: string | null;
  transportReference: string | null;
  notes: string | null;
  lines: ShipmentLineRequest[];
}
