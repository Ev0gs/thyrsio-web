/** Miroir des DTO de l'API (package referentiel). */

export interface ArticleRow {
  id: string;
  code: string;
  label: string;
  categoryCode: string;
  categoryLabel: string;
  lotTracked: boolean;
  unitCode: string;
  mainSupplierId: string | null;
  mainSupplierName: string | null;
  supplierReference: string | null;
  alertThreshold: number | null;
  active: boolean;
  createdAt: string;
}

export interface CategoryRow {
  id: string;
  code: string;
  label: string;
  defaultUnitCode: string;
  lotTracked: boolean;
  regulated: boolean;
  active: boolean;
}

export interface UnitRow {
  id: string;
  code: string;
  label: string;
  decimals: number;
}

/** PUT /api/referentiel/articles/{id} : le code et l'unité sont définitifs. */
export interface UpdateArticleRequest {
  label: string;
  categoryCode: string;
  mainSupplierId: string | null;
  supplierReference: string | null;
  alertThreshold: number | null;
}

/** POST /api/referentiel/articles */
export interface CreateArticleRequest extends UpdateArticleRequest {
  code: string;
  unitCode: string | null; // null : l'unité par défaut de la catégorie
}

/** Ce que fournit un fournisseur : matières sèches (stock) ou vin en vrac (cuverie). */
export type SupplierKind = 'DRY_GOODS' | 'WINE';

export const SUPPLIER_KIND_LABELS: Record<SupplierKind, string> = {
  DRY_GOODS: 'Matières sèches',
  WINE: 'Vin en vrac',
};

export interface SupplierRow {
  id: string;
  name: string;
  kind: SupplierKind;
  active: boolean;
}

export interface SupplierDetail extends SupplierRow {
  email: string | null;
  phone: string | null;
  address: string | null;
  averageLeadTimeDays: number | null;
  createdAt: string;
}

/** POST et PUT /api/referentiel/suppliers : la même requête (aucun champ définitif). */
export interface SupplierRequest {
  name: string;
  kind: SupplierKind;
  email: string | null;
  phone: string | null;
  address: string | null;
  averageLeadTimeDays: number | null;
}

export type Incoterm =
  'EXW' | 'FCA' | 'CPT' | 'CIP' | 'DAP' | 'DPU' | 'DDP' | 'FAS' | 'FOB' | 'CFR' | 'CIF';

export const INCOTERMS: { code: Incoterm; label: string }[] = [
  { code: 'EXW', label: "EXW — À l'usine (enlèvement par le client)" },
  { code: 'FCA', label: 'FCA — Franco transporteur' },
  { code: 'CPT', label: "CPT — Port payé jusqu'à" },
  { code: 'CIP', label: 'CIP — Port payé, assurance comprise' },
  { code: 'DAP', label: 'DAP — Rendu au lieu de destination' },
  { code: 'DPU', label: 'DPU — Rendu déchargé' },
  { code: 'DDP', label: 'DDP — Rendu droits acquittés' },
  { code: 'FAS', label: 'FAS — Franco le long du navire' },
  { code: 'FOB', label: 'FOB — Franco à bord' },
  { code: 'CFR', label: 'CFR — Coût et fret' },
  { code: 'CIF', label: 'CIF — Coût, assurance et fret' },
];

export interface ClientRow {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  language: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  exciseNumber: string | null;
  defaultIncoterm: Incoterm | null;
  gs1LabelingRequired: boolean;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

/** PUT /api/referentiel/clients/{id} : tout sauf le code, définitif. */
export interface UpdateClientRequest {
  name: string;
  countryCode: string;
  language: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  exciseNumber: string | null;
  defaultIncoterm: Incoterm | null;
  gs1LabelingRequired: boolean;
  notes: string | null;
}

export interface CreateClientRequest extends UpdateClientRequest {
  code: string;
}

/** GET /api/referentiel/clients/{id}/delivery-addresses */
export interface DeliveryAddress {
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
  defaultAddress: boolean;
  active: boolean;
  createdAt: string;
}

/** POST et PUT : la même requête (PUT = remplacement complet). */
export interface DeliveryAddressRequest {
  label: string;
  recipientName: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  city: string;
  countryCode: string;
  phone: string | null;
  deliveryInstructions: string | null;
  defaultAddress: boolean;
}

/** Une adresse lue → la requête qui la réécrit telle quelle (pour ne changer qu'un champ avec un PUT). */
export function toAddressRequest(address: DeliveryAddress): DeliveryAddressRequest {
  const { id, clientId, active, createdAt, ...request } = address;
  return request;
}
