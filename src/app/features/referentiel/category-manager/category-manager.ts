import { Component, computed, inject, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { problemMessage } from '../../../core/api/problem';
import { CategoryForm } from '../category-form/category-form';
import { ReferentielApi } from '../referentiel-api';
import { CategoryRow } from '../referentiel.models';

/**
 * Les catégories d'articles : la liste, archivées comprises, et leur création ou modification
 * au même endroit (le formulaire remplace la liste le temps de la saisie).
 */
@Component({
  selector: 'app-category-manager',
  imports: [NgIcon, CategoryForm, HlmBadgeImports, HlmButtonImports, HlmSkeletonImports],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw })],
  templateUrl: './category-manager.html',
})
export class CategoryManager {
  /** Une catégorie a été créée, modifiée, archivée ou réactivée : les listes de choix sont à recharger. */
  readonly changed = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly categories = httpResource<CategoryRow[]>(() => ({
    url: '/api/referentiel/categories',
    params: { includeArchived: true },
  }));
  protected readonly rows = computed(() =>
    (this.categories.hasValue() ? this.categories.value() : [])
      .slice()
      .sort((a, b) => Number(b.active) - Number(a.active) || a.label.localeCompare(b.label, 'fr')),
  );

  /** undefined : la liste ; null : une nouvelle catégorie ; une catégorie : sa modification. */
  protected readonly editing = signal<CategoryRow | null | undefined>(undefined);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected edit(category: CategoryRow | null): void {
    this.actionError.set(null);
    this.editing.set(category);
  }

  protected onSaved(): void {
    this.editing.set(undefined);
    this.categories.reload();
    this.changed.emit();
  }

  protected async toggleActive(category: CategoryRow): Promise<void> {
    this.actionError.set(null);
    this.busy.set(true);
    try {
      await this.api.setActive('categories', category.id, !category.active);
      this.categories.reload();
      this.changed.emit();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
