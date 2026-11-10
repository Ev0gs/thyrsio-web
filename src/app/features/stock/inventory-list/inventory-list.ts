import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucidePlus,
  lucideRotateCw,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { InventoryCreateForm } from '../inventory-create-form/inventory-create-form';
import { InventoryStatusBadge } from '../inventory-status-badge/inventory-status-badge';
import { Inventory, InventoryStatus, InventorySummary } from '../stock.models';

@Component({
  selector: 'app-inventory-list',
  imports: [
    DatePipe,
    NgIcon,
    RouterLink,
    InventoryCreateForm,
    InventoryStatusBadge,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({ lucideChevronLeft, lucideChevronRight, lucidePlus, lucideRotateCw }),
  ],
  templateUrl: './inventory-list.html',
})
export class InventoryList {
  private readonly router = inject(Router);

  // ---------- L'URL : ?statut=DRAFT&page=2, et ?nouveau=1 pour ouvrir le dialogue de création ----------

  readonly statut = input<InventoryStatus>();
  readonly nouveau = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly statusFilters: { value: InventoryStatus | ''; label: string }[] = [
    { value: '', label: 'Tous' },
    { value: 'DRAFT', label: 'Brouillons' },
    { value: 'VALIDATED', label: 'Validés' },
    { value: 'CANCELLED', label: 'Annulés' },
  ];

  protected readonly inventories = httpResource<Page<InventorySummary>>(() => {
    const params: Record<string, string | number> = { page: this.page() - 1, size: 20 };
    const statut = this.statut();
    if (statut) params['status'] = statut;
    return { url: '/api/stock/inventories', params };
  });

  protected readonly pageInfo = computed(() =>
    this.inventories.hasValue() ? this.inventories.value().page : null,
  );

  /** Ouvert d'office si l'URL contient ?nouveau=1 (bouton de l'écran Stock), modifiable ensuite. */
  protected readonly dialogState = linkedSignal<'open' | 'closed'>(() =>
    this.nouveau() === '1' ? 'open' : 'closed',
  );

  protected closeDialog(): void {
    this.dialogState.set('closed');
    // On retire ?nouveau=1, sinon le dialogue se rouvrirait en rechargeant la page
    if (this.nouveau()) {
      this.router.navigate([], {
        queryParams: { nouveau: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /** L'inventaire est créé : on va directement le compter. */
  protected onCreated(inventory: Inventory): void {
    this.dialogState.set('closed');
    this.router.navigate(['/stock/inventaires', inventory.id]);
  }

  protected setStatus(status: InventoryStatus | ''): void {
    this.router.navigate([], {
      queryParams: { statut: status || null, page: null },
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
