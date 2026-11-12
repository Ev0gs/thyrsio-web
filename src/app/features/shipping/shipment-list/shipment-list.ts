import { Component, computed, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { countryName } from '../../../core/i18n/countries';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { ShipmentStatusBadge } from '../shipment-status-badge/shipment-status-badge';
import { ShipmentRow, ShipmentStatus } from '../shipping.models';

type View = 'draft' | 'shipped' | 'all';

const VIEWS: { value: View; label: string }[] = [
  { value: 'draft', label: 'En préparation' },
  { value: 'shipped', label: 'Parties' },
  { value: 'all', label: 'Toutes' },
];

/** Les expéditions : par défaut, les chargements en préparation, du plus proche au plus lointain. */
@Component({
  selector: 'app-shipment-list',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    ShipmentStatusBadge,
    HlmButtonImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucideRotateCw })],
  templateUrl: './shipment-list.html',
})
export class ShipmentList {
  private readonly router = inject(Router);

  readonly vue = input<View>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly views = VIEWS;
  protected readonly countryName = countryName;
  protected readonly view = computed<View>(() => this.vue() ?? 'draft');

  protected readonly shipments = httpResource<Page<ShipmentRow>>(() => {
    const params: Record<string, string | number> = { page: this.page() - 1, size: 25 };
    const status: Record<View, ShipmentStatus | null> = {
      draft: 'DRAFT',
      shipped: 'SHIPPED',
      all: null,
    };
    const value = status[this.view()];
    if (value) params['status'] = value;
    params['sort'] = this.view() === 'draft' ? 'plannedDate,asc' : 'plannedDate,desc';
    return { url: '/api/shipping/shipments', params };
  });

  protected readonly rows = computed(() =>
    this.shipments.hasValue() ? this.shipments.value().content : [],
  );
  protected readonly pageInfo = computed(() =>
    this.shipments.hasValue() ? this.shipments.value().page : null,
  );

  protected setView(view: View): void {
    this.router.navigate([], {
      queryParams: { vue: view === 'draft' ? null : view, page: null },
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
