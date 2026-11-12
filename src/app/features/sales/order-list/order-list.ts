import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { countryName } from '../../../core/i18n/countries';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { OrderForm } from '../order-form/order-form';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';
import { Order, OrderRow } from '../sales.models';

type View = 'open' | 'draft' | 'shipped' | 'cancelled' | 'all';

const VIEWS: { value: View; label: string }[] = [
  { value: 'open', label: 'À expédier' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'cancelled', label: 'Annulées' },
  { value: 'all', label: 'Toutes' },
];

/** Les commandes clients. Par défaut, celles qui attendent encore des bouteilles. Filtres dans l'URL. */
@Component({
  selector: 'app-order-list',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    OrderForm,
    OrderStatusBadge,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw, lucideSearch })],
  templateUrl: './order-list.html',
})
export class OrderList {
  private readonly router = inject(Router);

  readonly vue = input<View>();
  readonly q = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly views = VIEWS;
  protected readonly countryName = countryName;
  protected readonly view = computed<View>(() => this.vue() ?? 'open');

  protected readonly orders = httpResource<Page<OrderRow>>(() => {
    const params: Record<string, string | number | boolean> = { page: this.page() - 1, size: 25 };
    switch (this.view()) {
      case 'open':
        params['open'] = true;
        params['sort'] = 'requestedLoadingDate,asc';
        break;
      case 'draft':
        params['status'] = 'DRAFT';
        break;
      case 'shipped':
        params['status'] = 'SHIPPED';
        break;
      case 'cancelled':
        params['status'] = 'CANCELLED';
        break;
    }
    const q = this.q();
    if (q) params['q'] = q;
    return { url: '/api/sales/orders', params };
  });

  protected readonly rows = computed(() =>
    this.orders.hasValue() ? this.orders.value().content : [],
  );
  protected readonly pageInfo = computed(() =>
    this.orders.hasValue() ? this.orders.value().page : null,
  );

  protected readonly dialogOpen = signal(false);

  protected setView(view: View): void {
    this.router.navigate([], {
      queryParams: { vue: view === 'open' ? null : view, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setSearch(value: string): void {
    this.router.navigate([], {
      queryParams: { q: value.trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected onCreated(order: Order): void {
    this.dialogOpen.set(false);
    this.router.navigate(['/ventes/commandes', order.id]);
  }
}
