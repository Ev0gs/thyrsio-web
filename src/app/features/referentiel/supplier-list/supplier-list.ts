import { Component, inject, input, signal } from '@angular/core';
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
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { ReferentielApi } from '../referentiel-api';
import { SupplierDetail } from '../referentiel.models';
import { SupplierForm } from '../supplier-form/supplier-form';

@Component({
  selector: 'app-supplier-list',
  imports: [
    NgIcon,
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
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly suppliers = httpResource<Page<SupplierDetail>>(() => ({
    url: '/api/referentiel/suppliers',
    params: {
      page: this.page() - 1,
      size: 25,
      sort: 'name',
      includeArchived: this.archives() === '1',
    },
  }));

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly editing = signal<SupplierDetail | null>(null);
  protected readonly actionError = signal<string | null>(null);

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
