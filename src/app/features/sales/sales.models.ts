/** Miroir des DTO de l'API (package sales). Les quantités sont en bouteilles. */
import { GeoLocation } from '../../core/geo';
import { Incoterm } from '../referentiel/referentiel.models';

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Brouillon',
  CONFIRMED: 'Confirmée',
  PARTIALLY_SHIPPED: 'Expédiée en partie',
  SHIPPED: 'Expédiée',
  CANCELLED: 'Annulée',
};

/** Une commande "ouverte" attend encore des bouteilles : elle peut être expédiée. */
export const isOpen = (status: OrderStatus) =>
  status === 'CONFIRMED' || status === 'PARTIALLY_SHIPPED';

/** GET /api/sales/orders */
export interface OrderRow {
  id: string;
  code: string;
  status: OrderStatus;
  clientId: string;
  clientName: string | null;
  clientCountryCode: string | null;
  customerReference: string | null;
  orderDate: string;
  requestedLoadingDate: string | null;
  lineCount: number;
  totalBottles: number;
  shippedBottles: number;
  /** Ni en stock ni prévu par une mise : à planifier. */
  missingBottles: number;
}

/** Une mise qui produit pour une ligne. */
export interface OrderAllocation {
  bottlingId: string;
  bottlingCode: string;
  startDate: string;
  bottlingStatus: 'PLANNED' | 'CLOSED';
  quantity: number;
}

/**
 * fromStock / fromBottlings / missing : seulement pour une commande confirmée qui attend encore
 * des bouteilles (null sinon). remaining = fromStock + fromBottlings + missing.
 */
export interface OrderLine {
  id: string;
  articleId: string;
  articleCode: string | null;
  articleLabel: string | null;
  quantity: number;
  unitPrice: number | null;
  shippedQuantity: number;
  remaining: number;
  fromStock: number | null;
  fromBottlings: number | null;
  missing: number | null;
  allocations: OrderAllocation[];
}

export interface ShipmentSummary {
  id: string;
  code: string;
  status: 'DRAFT' | 'SHIPPED' | 'CANCELLED';
  plannedDate: string;
  shippedAt: string | null;
  bottles: number;
}

export interface OrderDeliveryAddress {
  id: string;
  clientId: string;
  label: string;
  recipientName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  city: string;
  countryCode: string;
  phone: string | null;
  deliveryInstructions: string | null;
  active: boolean;
  location: GeoLocation | null;
}

/** GET /api/sales/orders/{id} */
export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  clientId: string;
  clientCode: string;
  clientName: string;
  clientCountryCode: string;
  deliveryAddressId: string | null;
  deliveryAddress: OrderDeliveryAddress | null;
  customerReference: string | null;
  orderDate: string;
  requestedLoadingDate: string | null;
  incoterm: Incoterm | null;
  notes: string | null;
  lines: OrderLine[];
  totalBottles: number;
  shippedBottles: number;
  totalAmount: number | null;
  shipments: ShipmentSummary[];
  confirmedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/sales/order-lines/to-plan */
export interface LineToPlan {
  lineId: string;
  orderId: string;
  orderCode: string;
  clientName: string | null;
  articleId: string;
  articleCode: string | null;
  articleLabel: string | null;
  requestedLoadingDate: string | null;
  remaining: number;
  fromStock: number;
  fromBottlings: number;
  missing: number;
}

// ---------- Les requêtes ----------

export interface OrderLineRequest {
  articleId: string;
  quantity: number;
  unitPrice: number | null;
}

export interface UpdateOrderRequest {
  deliveryAddressId: string | null;
  customerReference: string | null;
  orderDate: string;
  requestedLoadingDate: string | null;
  incoterm: Incoterm | null;
  notes: string | null;
  lines: OrderLineRequest[];
}

export interface CreateOrderRequest extends Omit<UpdateOrderRequest, 'orderDate'> {
  clientId: string;
  orderDate: string | null;
}
