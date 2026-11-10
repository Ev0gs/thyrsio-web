import { Route, Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';

/**
 * Tant qu'un écran n'existe pas, sa route affiche la page "en construction".
 * On remplacera chaque ligne par le vrai composant au fil des étapes.
 */
const placeholder = (path: string, heading: string): Route => ({
  path,
  title: `${heading} · Thyrsio`, // titre de l'onglet du navigateur
  data: { heading }, // arrive dans l'input "heading"
  loadComponent: () => import('./pages/placeholder/placeholder').then((m) => m.Placeholder),
});

export const routes: Routes = [
  {
    path: '',
    component: Shell, // la mise en page commune : barre latérale + contenu
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
      placeholder('tableau-de-bord', 'Tableau de bord'),
      {
        path: 'stock',
        title: 'Matières sèches · Thyrsio',
        loadComponent: () =>
          import('./features/stock/stock-overview/stock-overview').then((m) => m.StockOverview),
      },
      placeholder('stock/mouvements', 'Mouvements'),
      placeholder('stock/inventaires', 'Inventaires'),
      placeholder('referentiel/articles', 'Articles'),
      placeholder('referentiel/clients', 'Clients'),
      placeholder('referentiel/fournisseurs', 'Fournisseurs'),
    ],
  },
  { path: '**', redirectTo: '' },
];
