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
  { path: '**', redirectTo: '' },
];
