import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideArrowUpDown,
  lucideBarcode,
  lucideClipboardList,
  lucideContainer,
  lucideFactory,
  lucideGrape,
  lucideLayoutDashboard,
  lucideMapPin,
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

/**
 * Les icônes des pages, les mêmes que dans la barre latérale :
 * le titre d'une page reprend l'icône de l'entrée de menu qui y mène.
 */
const PAGE_ICONS = {
  lucideArrowLeftRight,
  lucideArrowUpDown,
  lucideBarcode,
  lucideClipboardList,
  lucideContainer,
  lucideFactory,
  lucideGrape,
  lucideLayoutDashboard,
  lucideMapPin,
  lucidePackage,
  lucidePackageCheck,
  lucideRuler,
  lucideShoppingCart,
  lucideTag,
  lucideTags,
  lucideTruck,
  lucideUsers,
  lucideWine,
};

export type PageIconName = keyof typeof PAGE_ICONS;

/** L'icône d'une page, dans un carré teinté, à placer dans son <h1>. */
@Component({
  selector: 'app-page-icon',
  imports: [NgIcon],
  viewProviders: [provideIcons(PAGE_ICONS)],
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <span class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <ng-icon [name]="name()" size="22" />
    </span>
  `,
})
export class PageIcon {
  readonly name = input.required<PageIconName>();
}
