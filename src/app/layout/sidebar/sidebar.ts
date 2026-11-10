import { Component, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpDown,
  lucideClipboardList,
  lucideContainer,
  lucideFactory,
  lucideLayoutDashboard,
  lucideLogOut,
  lucidePackage,
  lucideShoppingCart,
  lucideTag,
  lucideTruck,
  lucideUsers,
  lucideWine,
} from '@ng-icons/lucide';
import { CurrentUser } from '../../core/auth/current-user';

interface NavItem {
  label: string;
  icon: string;
  /** Sans route : module pas encore développé, affiché "À venir". */
  route?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  // Seules les icônes déclarées ici sont incluses dans l'application
  viewProviders: [
    provideIcons({
      lucideLayoutDashboard,
      lucidePackage,
      lucideArrowUpDown,
      lucideClipboardList,
      lucideWine,
      lucideContainer,
      lucideShoppingCart,
      lucideTruck,
      lucideTag,
      lucideUsers,
      lucideFactory,
    }),
  ],
  templateUrl: './sidebar.html',
})
export class Sidebar {
  /**
   * Un lien est actif si le CHEMIN correspond exactement (/stock ne s'allume pas sur /stock/mouvements),
   * quels que soient les paramètres après le "?" (filtres, page...).
   */
  protected readonly activeOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  protected readonly user = inject(CurrentUser);

  // Les groupes suivent les modules de l'API
  protected readonly groups: NavGroup[] = [
    {
      label: 'Pilotage',
      items: [
        { label: 'Tableau de bord', icon: 'lucideLayoutDashboard', route: '/tableau-de-bord' },
      ],
    },
    {
      label: 'Stock',
      items: [
        { label: 'Matières sèches', icon: 'lucidePackage', route: '/stock' },
        { label: 'Mouvements', icon: 'lucideArrowUpDown', route: '/stock/mouvements' },
        { label: 'Inventaires', icon: 'lucideClipboardList', route: '/stock/inventaires' },
      ],
    },
    {
      label: 'Production',
      items: [
        { label: 'Mises en bouteille', icon: 'lucideWine' },
        { label: 'Cuverie', icon: 'lucideContainer' },
      ],
    },
    {
      label: 'Ventes',
      items: [
        { label: 'Commandes clients', icon: 'lucideShoppingCart' },
        { label: 'Expéditions', icon: 'lucideTruck' },
      ],
    },
    {
      label: 'Référentiel',
      items: [
        { label: 'Articles', icon: 'lucideTag', route: '/referentiel/articles' },
        { label: 'Clients', icon: 'lucideUsers', route: '/referentiel/clients' },
        { label: 'Fournisseurs', icon: 'lucideFactory', route: '/referentiel/fournisseurs' },
      ],
    },
  ];
}
