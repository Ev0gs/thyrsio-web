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
  lucidePackageCheck,
  lucideRuler,
  lucideShoppingCart,
  lucideTag,
  lucideTags,
  lucideTruck,
  lucideUsers,
  lucideWine,
} from '@ng-icons/lucide';
import { CurrentUser } from '../../core/auth/current-user';
import { FEATURES } from '../../core/features';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  /** Rester actif sur les sous-pages (/stock/inventaires/123). Pas pour /stock, qui englobe tout le module. */
  includeSubPaths?: boolean;
  /** Fait partie des ventes : masqué tant que FEATURES.sales est faux. */
  sales?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  sales?: boolean;
}

/** Les groupes et entrées des ventes disparaissent du menu quand le module est masqué. */
const visible = (groups: NavGroup[]): NavGroup[] =>
  groups
    .filter((group) => FEATURES.sales || !group.sales)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => FEATURES.sales || !item.sales),
    }))
    .filter((group) => group.items.length > 0);

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  // Seules les icônes déclarées ici sont incluses dans l'application
  viewProviders: [
    provideIcons({
      lucideLayoutDashboard,
      lucidePackage,
      lucidePackageCheck,
      lucideRuler,
      lucideArrowUpDown,
      lucideClipboardList,
      lucideWine,
      lucideContainer,
      lucideGrape,
      lucideArrowLeftRight,
      lucideShoppingCart,
      lucideTruck,
      lucideTag,
      lucideTags,
      lucideUsers,
      lucideFactory,
      lucideLogOut,
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
  protected readonly groups: NavGroup[] = visible([
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
        { label: 'Produits finis', icon: 'lucidePackageCheck', route: '/stock/produits-finis' },
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
      items: [
        {
          label: 'Mises en bouteille',
          icon: 'lucideWine',
          route: '/production/mises',
          includeSubPaths: true,
        },
      ],
    },
    {
      label: 'Ventes',
      sales: true,
      items: [
        {
          label: 'Commandes clients',
          icon: 'lucideShoppingCart',
          route: '/ventes/commandes',
          includeSubPaths: true,
        },
        {
          label: 'Expéditions',
          icon: 'lucideTruck',
          route: '/ventes/expeditions',
          includeSubPaths: true,
        },
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
          sales: true,
        },
        {
          label: 'Catégories',
          icon: 'lucideTags',
          route: '/referentiel/categories',
          includeSubPaths: true,
        },
        {
          label: 'Unités',
          icon: 'lucideRuler',
          route: '/referentiel/unites',
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
  ]);
}
