/**
 * Les modules affichés dans l'application.
 *
 * Branche production : l'outil est recentré sur la mise en bouteille (stock de matières sèches,
 * cuverie, mises, fournisseurs). Les ventes (clients, commandes, expéditions, bon de livraison
 * et réservations de mises pour des commandes) sont masquées : leur code reste en place,
 * et passer `sales` à true les fait réapparaître partout.
 * L'ERP complet, avec les ventes affichées, est conservé sur la branche erp-complet.
 */
export const FEATURES = {
  sales: false,
} as const;
