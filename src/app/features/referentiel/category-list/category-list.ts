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
import { problemMessage } from '../../../core/api/problem';
import { CategoryForm } from '../category-form/category-form';
import { ReferentielApi } from '../referentiel-api';
import { CategoryRow } from '../referentiel.models';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';

/** Les catégories d'articles (Bouchon, Capsule CRD…) : leur unité par défaut et leur suivi par lot. */
@Component({
  selector: 'app-category-list',
  imports: [
    PageIcon,
    NgIcon,
    CategoryForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw })],
  templateUrl: './category-list.html',
})
export class CategoryList {
  private readonly router = inject(Router);
  private readonly api = inject(ReferentielApi);

  /** ?archives=1 : les catégories archivées aussi. */
  readonly archives = input<string>();
  protected readonly showArchived = computed(() => this.archives() === '1');

  protected readonly categories = httpResource<CategoryRow[]>(() => ({
    url: '/api/referentiel/categories',
    params: { includeArchived: this.showArchived() },
  }));
  protected readonly rows = computed(() =>
    (this.categories.hasValue() ? this.categories.value() : [])
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, 'fr')),
  );

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  /** null : création ; une catégorie : modification. */
  protected readonly editing = signal<CategoryRow | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected open(category: CategoryRow | null): void {
    this.editing.set(category);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.categories.reload();
  }

  /** Réversible et sans perte : pas de confirmation. */
  protected async toggleActive(category: CategoryRow): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.setActive('categories', category.id, !category.active);
      this.categories.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }

  protected setShowArchived(show: boolean): void {
    this.router.navigate([], {
      queryParams: { archives: show ? '1' : null },
      queryParamsHandling: 'merge',
    });
  }
}
