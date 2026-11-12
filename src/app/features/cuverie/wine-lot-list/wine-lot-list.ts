import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { WINE_COLOR_LABELS, WineLotRow } from '../cuverie.models';
import { WineLabel } from '../wine-label/wine-label';

const PAGE_SIZE = 20;

/** Tous les lots de vin reçus. Par défaut, seulement ceux qui sont encore en cuve. */
@Component({
  selector: 'app-wine-lot-list',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
    WineLabel,
  ],
  viewProviders: [provideIcons({ lucideRotateCw, lucideSearch })],
  templateUrl: './wine-lot-list.html',
})
export class WineLotList {
  private readonly router = inject(Router);

  // ---------- Les paramètres de l'URL ----------

  /** ?tous=1 : y compris les lots qui ne sont plus en cuve (mis en bouteille, épuisés). */
  readonly tous = input<string>();
  readonly q = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly colorLabels = WINE_COLOR_LABELS;
  protected readonly showAll = computed(() => this.tous() === '1');

  protected readonly lots = httpResource<Page<WineLotRow>>(() => {
    const params: Record<string, string | number | boolean> = {
      page: this.page() - 1,
      size: PAGE_SIZE,
      inTank: !this.showAll(),
    };
    const q = this.q();
    if (q) params['q'] = q;
    return { url: '/api/cuverie/wine-lots', params };
  });

  protected readonly rows = computed(() => (this.lots.hasValue() ? this.lots.value().content : []));
  protected readonly pageInfo = computed(() =>
    this.lots.hasValue() ? this.lots.value().page : null,
  );

  protected setSearch(value: string): void {
    this.router.navigate([], {
      queryParams: { q: value.trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setShowAll(show: boolean): void {
    this.router.navigate([], {
      queryParams: { tous: show ? '1' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
