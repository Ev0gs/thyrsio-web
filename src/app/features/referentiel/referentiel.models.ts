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

export interface SupplierRow {
  id: string;
  name: string;
  active: boolean;
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
