import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: '',
    component: Shell, // la mise en page commune : barre latérale + contenu
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      {
        path: 'tableau-de-bord',
        title: 'Tableau de bord · Thyrsio',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'stock',
        title: 'Matières sèches · Thyrsio',
        loadComponent: () =>
          import('./features/stock/stock-overview/stock-overview').then((m) => m.StockOverview),
      },
      {
        path: 'stock/produits-finis',
        title: 'Produits finis · Thyrsio',
        // Le même écran que les matières sèches : data devient l'input finishedGoods du composant
        data: { finishedGoods: true },
        loadComponent: () =>
          import('./features/stock/stock-overview/stock-overview').then((m) => m.StockOverview),
      },
      {
        path: 'stock/mouvements',
        title: 'Mouvements · Thyrsio',
        loadComponent: () =>
          import('./features/stock/stock-movements/stock-movements').then((m) => m.StockMovements),
      },
      {
        path: 'stock/inventaires',
        title: 'Inventaires · Thyrsio',
        loadComponent: () =>
          import('./features/stock/inventory-list/inventory-list').then((m) => m.InventoryList),
      },
      {
        path: 'stock/inventaires/:id',
        title: 'Inventaire · Thyrsio',
        loadComponent: () =>
          import('./features/stock/inventory-detail/inventory-detail').then(
            (m) => m.InventoryDetail,
          ),
      },
      {
        path: 'production/mises',
        title: 'Mises en bouteille · Thyrsio',
        loadComponent: () =>
          import('./features/production/bottling-planning/bottling-planning').then(
            (m) => m.BottlingPlanning,
          ),
      },
      {
        path: 'production/mises/:id',
        title: 'Mise en bouteille · Thyrsio',
        loadComponent: () =>
          import('./features/production/bottling-detail/bottling-detail').then(
            (m) => m.BottlingDetail,
          ),
      },
      { path: 'cuverie', pathMatch: 'full', redirectTo: 'cuverie/cuves' },
      {
        path: 'cuverie/cuves',
        title: 'Cuverie · Thyrsio',
        loadComponent: () =>
          import('./features/cuverie/tank-overview/tank-overview').then((m) => m.TankOverview),
      },
      {
        path: 'cuverie/cuves/:id',
        title: 'Cuve · Thyrsio',
        loadComponent: () =>
          import('./features/cuverie/tank-detail/tank-detail').then((m) => m.TankDetail),
      },
      {
        path: 'cuverie/lots',
        title: 'Lots de vin · Thyrsio',
        loadComponent: () =>
          import('./features/cuverie/wine-lot-list/wine-lot-list').then((m) => m.WineLotList),
      },
      {
        path: 'cuverie/lots/:id',
        title: 'Lot de vin · Thyrsio',
        loadComponent: () =>
          import('./features/cuverie/wine-lot-detail/wine-lot-detail').then((m) => m.WineLotDetail),
      },
      {
        path: 'cuverie/mouvements',
        title: 'Mouvements de vin · Thyrsio',
        loadComponent: () =>
          import('./features/cuverie/cuverie-movements/cuverie-movements').then(
            (m) => m.CuverieMovements,
          ),
      },
      {
        path: 'ventes/commandes',
        title: 'Commandes clients · Thyrsio',
        loadComponent: () =>
          import('./features/sales/order-list/order-list').then((m) => m.OrderList),
      },
      {
        path: 'ventes/commandes/:id',
        title: 'Commande · Thyrsio',
        loadComponent: () =>
          import('./features/sales/order-detail/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: 'ventes/expeditions',
        title: 'Expéditions · Thyrsio',
        loadComponent: () =>
          import('./features/shipping/shipment-list/shipment-list').then((m) => m.ShipmentList),
      },
      {
        path: 'ventes/expeditions/:id',
        title: 'Expédition · Thyrsio',
        loadComponent: () =>
          import('./features/shipping/shipment-detail/shipment-detail').then(
            (m) => m.ShipmentDetail,
          ),
      },
      {
        path: 'referentiel/articles',
        title: 'Articles · Thyrsio',
        loadComponent: () =>
          import('./features/referentiel/article-list/article-list').then((m) => m.ArticleList),
      },
      {
        path: 'referentiel/clients',
        title: 'Clients · Thyrsio',
        loadComponent: () =>
          import('./features/referentiel/client-list/client-list').then((m) => m.ClientList),
      },
      {
        path: 'referentiel/clients/:id',
        title: 'Client · Thyrsio',
        loadComponent: () =>
          import('./features/referentiel/client-detail/client-detail').then((m) => m.ClientDetail),
      },
      {
        path: 'referentiel/fournisseurs',
        title: 'Fournisseurs · Thyrsio',
        loadComponent: () =>
          import('./features/referentiel/supplier-list/supplier-list').then((m) => m.SupplierList),
      },
    ],
  },
  // Hors de la mise en page : une page à imprimer
  {
    path: 'impression/bon-de-livraison/:id',
    title: 'Bon de livraison · Thyrsio',
    loadComponent: () =>
      import('./features/shipping/delivery-note/delivery-note').then((m) => m.DeliveryNote),
  },
  { path: '**', redirectTo: '' },
];
