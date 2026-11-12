import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { startOfDay } from '../../../core/dates';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Tank, TANK_MOVEMENT_TYPE_LABELS, TankMovement, TankMovementType } from '../cuverie.models';
import { WineLabel } from '../wine-label/wine-label';

const PAGE_SIZE = 25;

interface Filters {
  cuve: string;
  type: string;
  from: string;
  to: string;
}

/** Le journal de la cuverie : réceptions, transferts, pertes, jaugeages, mises. Filtres dans l'URL. */
@Component({
  selector: 'app-cuverie-movements',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    WineLabel,
    HlmBadgeImports,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucideRotateCw, lucideX })],
  templateUrl: './cuverie-movements.html',
})
export class CuverieMovements {
  private readonly router = inject(Router);

  readonly cuve = input<string>();
  readonly type = input<TankMovementType>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly typeLabels = TANK_MOVEMENT_TYPE_LABELS;
  protected readonly types = Object.keys(TANK_MOVEMENT_TYPE_LABELS) as TankMovementType[];
  protected readonly selectClass = SELECT_CLASS;

  private readonly apiParams = computed(() => {
    const params: Record<string, string | number> = { page: this.page() - 1, size: PAGE_SIZE };
    const tank = this.cuve();
    const type = this.type();
    const from = this.from();
    const to = this.to();
    if (tank) params['tankId'] = tank;
    if (type) params['type'] = type;
    if (from) params['from'] = startOfDay(from);
    if (to) params['to'] = startOfDay(to, 1);
    return params;
  });

  protected readonly movements = httpResource<Page<TankMovement>>(() => ({
    url: '/api/cuverie/movements',
    params: this.apiParams(),
  }));

  /** Les cuves, pour le filtre (archivées comprises : leur historique reste consultable). */
  private readonly tanks = httpResource<Tank[]>(() => ({
    url: '/api/cuverie/tanks',
    params: { includeArchived: true },
  }));

  protected readonly tankOptions = computed(() =>
    this.tanks.hasValue() ? this.tanks.value() : [],
  );
  protected readonly rows = computed(() =>
    this.movements.hasValue() ? this.movements.value().content : [],
  );
  protected readonly pageInfo = computed(() =>
    this.movements.hasValue() ? this.movements.value().page : null,
  );
  protected readonly hasFilters = computed(
    () => !!(this.cuve() || this.type() || this.from() || this.to()),
  );

  protected setFilter(name: keyof Filters, value: string): void {
    this.router.navigate([], {
      queryParams: { [name]: value || null, page: null },
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
