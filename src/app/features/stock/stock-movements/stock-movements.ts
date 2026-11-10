import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { MOVEMENT_TYPE_LABELS, MovementRow, MovementType, StockOverviewRow } from '../stock.models';

const PAGE_SIZE = 25;

/** "2026-11-01" → minuit (heure locale) ce jour-là, au format attendu par l'API. */
function startOfDay(day: string, plusDays = 0): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + plusDays);
  return date.toISOString();
}

/** Les filtres tels qu'ils apparaissent dans l'URL. */
interface Filters {
  article: string;
  type: string;
  from: string;
  to: string;
}

@Component({
  selector: 'app-stock-movements',
  imports: [
    DatePipe,
    DecimalPipe,
    NgIcon,
    HlmBadgeImports,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideRotateCw, lucideX })],
  templateUrl: './stock-movements.html',
})
export class StockMovements {
  private readonly router = inject(Router);

  // ---------- Les paramètres de l'URL (?article=…&type=…), reçus grâce à withComponentInputBinding ----------

  readonly article = input<string>();
  readonly type = input<MovementType>();
  readonly from = input<string>();
  readonly to = input<string>();
  /** ?page=2 → 2 ; absent ou invalide → 1. L'URL compte à partir de 1, l'API à partir de 0. */
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  protected readonly types = Object.keys(MOVEMENT_TYPE_LABELS) as MovementType[];

  // ---------- Les données ----------

  /** La requête vers l'API, recalculée dès qu'un paramètre de l'URL change. */
  private readonly apiParams = computed(() => {
    const params: Record<string, string | number> = { page: this.page() - 1, size: PAGE_SIZE };
    const article = this.article();
    const type = this.type();
    const from = this.from();
    const to = this.to();
    if (article) params['articleId'] = article;
    if (type) params['type'] = type;
    if (from) params['from'] = startOfDay(from);
    if (to) params['to'] = startOfDay(to, 1); // "au 10" = jusqu'au 11 à minuit, exclu
    return params;
  });

  protected readonly movements = httpResource<Page<MovementRow>>(() => ({
    url: '/api/stock/movements',
    params: this.apiParams(),
  }));

  /** Les articles : pour la liste du filtre et pour afficher les libellés. */
  private readonly overview = httpResource<StockOverviewRow[]>(() => '/api/stock/overview');

  protected readonly articleOptions = computed(() =>
    (this.overview.hasValue() ? this.overview.value() : [])
      .filter((row) => row.active || row.articleId === this.article())
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );

  private readonly labelsById = computed(
    () =>
      new Map(
        (this.overview.hasValue() ? this.overview.value() : []).map((row) => [
          row.articleId,
          row.articleLabel,
        ]),
      ),
  );

  protected readonly rows = computed(() =>
    (this.movements.hasValue() ? this.movements.value().content : []).map((movement) => ({
      ...movement,
      articleLabel: this.labelsById().get(movement.articleId) ?? movement.articleCode,
    })),
  );

  protected readonly pageInfo = computed(() =>
    this.movements.hasValue() ? this.movements.value().page : null,
  );

  protected readonly hasFilters = computed(
    () => !!(this.article() || this.type() || this.from() || this.to()),
  );

  // ---------- Les actions : elles ne font que changer l'URL ----------

  /** Change un filtre ; on revient à la page 1, puisque les résultats ne sont plus les mêmes. */
  protected setFilter(name: keyof Filters, value: string): void {
    this.router.navigate([], {
      queryParams: { [name]: value || null, page: null }, // null retire le paramètre de l'URL
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters(): void {
    this.router.navigate([], { queryParams: {} });
  }
}
