import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { LocationMap, MapPoint } from '../../../shared/ui/location-map/location-map';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { ReferentielApi } from '../referentiel-api';
import { SupplierDetail } from '../referentiel.models';
import { SupplierForm } from '../supplier-form/supplier-form';

@Component({
  selector: 'app-supplier-list',
  imports: [
    NgIcon,
    LocationMap,
    Pagination,
    SupplierForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw })],
  templateUrl: './supplier-list.html',
})
export class SupplierList {
  private readonly router = inject(Router);
  private readonly api = inject(ReferentielApi);

  readonly archives = input<string>();
  /** ?vue=carte : les fournisseurs sur une carte plutôt qu'en tableau. */
  readonly vue = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly mapView = computed(() => this.vue() === 'carte');

  /** La liste : une page de 25. La carte : tous les fournisseurs d'un coup (quelques dizaines au plus). */
  protected readonly suppliers = httpResource<Page<SupplierDetail>>(() => ({
    url: '/api/referentiel/suppliers',
    params: {
      page: this.mapView() ? 0 : this.page() - 1,
      size: this.mapView() ? 1000 : 25,
      sort: 'name',
      includeArchived: this.archives() === '1',
    },
  }));

  protected readonly rows = computed(() =>
    this.suppliers.hasValue() ? this.suppliers.value().content : [],
  );

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly editing = signal<SupplierDetail | null>(null);
  protected readonly actionError = signal<string | null>(null);

  /** Les fournisseurs déjà localisés : le vin en bordeaux, les matières sèches en bleu. */
  protected readonly mapPoints = computed<MapPoint[]>(() =>
    this.rows()
      .filter((supplier) => supplier.location)
      .map((supplier) => ({
        id: supplier.id,
        label: supplier.name,
        detail: supplier.address ?? undefined,
        location: supplier.location!,
        primary: supplier.kind === 'WINE',
      })),
  );

  /** Un clic sur une épingle ouvre la fiche du fournisseur. */
  protected openFromMap(id: string): void {
    const supplier = this.suppliers.hasValue()
      ? this.suppliers.value().content.find((s) => s.id === id)
      : undefined;
    if (supplier) {
      this.open(supplier);
    }
  }

  protected open(supplier: SupplierDetail | null): void {
    this.editing.set(supplier);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.suppliers.reload();
  }

  protected async toggleActive(supplier: SupplierDetail): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.setActive('suppliers', supplier.id, !supplier.active);
      this.suppliers.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }

  protected setView(map: boolean): void {
    this.router.navigate([], {
      queryParams: { vue: map ? 'carte' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setShowArchived(show: boolean): void {
    this.router.navigate([], {
      queryParams: { archives: show ? '1' : null, page: null },
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
