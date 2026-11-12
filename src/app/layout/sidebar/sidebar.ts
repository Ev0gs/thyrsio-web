import { Component, inject } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideArrowUpDown,
  lucideClipboardList,
  lucideContainer,
  lucideFactory,
  lucideGrape,
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
  route?: string;
  /** Rester actif sur les sous-pages (/stock/inventaires/123). Pas pour /stock, qui englobe tout le module. */
  includeSubPaths?: boolean;
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
      lucideGrape,
      lucideArrowLeftRight,
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
  private readonly baseOptions = {
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  } as const;
  protected readonly exactOptions: IsActiveMatchOptions = { ...this.baseOptions, paths: 'exact' };
  protected readonly subPathOptions: IsActiveMatchOptions = {
    ...this.baseOptions,
    paths: 'subset',
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
        {
          label: 'Mouvements',
          icon: 'lucideArrowUpDown',
          route: '/stock/mouvements',
          includeSubPaths: true,
        },
        {
          label: 'Inventaires',
          icon: 'lucideClipboardList',
          route: '/stock/inventaires',
          includeSubPaths: true,
        },
      ],
    },
    {
      label: 'Cuverie',
      items: [
        { label: 'Cuves', icon: 'lucideContainer', route: '/cuverie/cuves', includeSubPaths: true },
        {
          label: 'Lots de vin',
          icon: 'lucideGrape',
          route: '/cuverie/lots',
          includeSubPaths: true,
        },
        {
          label: 'Mouvements de vin',
          icon: 'lucideArrowLeftRight',
          route: '/cuverie/mouvements',
          includeSubPaths: true,
        },
      ],
    },
    {
      label: 'Production',
      items: [{ label: 'Mises en bouteille', icon: 'lucideWine' }],
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
        {
          label: 'Articles',
          icon: 'lucideTag',
          route: '/referentiel/articles',
          includeSubPaths: true,
        },
        {
          label: 'Clients',
          icon: 'lucideUsers',
          route: '/referentiel/clients',
          includeSubPaths: true,
        },
        {
          label: 'Fournisseurs',
          icon: 'lucideFactory',
          route: '/referentiel/fournisseurs',
          includeSubPaths: true,
        },
      ],
    },
  ];
}
