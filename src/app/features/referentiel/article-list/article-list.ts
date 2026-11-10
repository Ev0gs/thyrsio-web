import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucidePlus,
  lucideRotateCw,
  lucideSearch,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { ArticleForm } from '../article-form/article-form';
import { ReferentielApi } from '../referentiel-api';
import { ArticleRow, CategoryRow } from '../referentiel.models';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-article-list',
  imports: [
    DecimalPipe,
    NgIcon,
    ArticleForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucidePlus,
      lucideRotateCw,
      lucideSearch,
    }),
  ],
  templateUrl: './article-list.html',
})
export class ArticleList {
  private readonly router = inject(Router);
  private readonly api = inject(ReferentielApi);

  // ---------- L'URL : ?q=bouchon&categorie=BOUCHON&archives=1&page=2 ----------

  readonly q = input<string>();
  readonly categorie = input<string>();
  readonly archives = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly showArchived = computed(() => this.archives() === '1');

  // ---------- Les données ----------

  protected readonly articles = httpResource<Page<ArticleRow>>(() => {
    const params: Record<string, string | number | boolean> = {
      page: this.page() - 1,
      size: PAGE_SIZE,
      sort: 'label',
    };
    const q = this.q();
    const categorie = this.categorie();
    if (q) params['search'] = q;
    if (categorie) params['categoryCode'] = categorie;
    if (this.showArchived()) params['includeArchived'] = true;
    return { url: '/api/referentiel/articles', params };
  });

  protected readonly categories = httpResource<CategoryRow[]>(() => '/api/referentiel/categories');

  protected readonly pageInfo = computed(() =>
    this.articles.hasValue() ? this.articles.value().page : null,
  );

  // ---------- Le dialogue : un seul, pour créer comme pour modifier ----------

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  /** null : création ; un article : modification. */
  protected readonly editing = signal<ArticleRow | null>(null);
  /** L'erreur d'un archivage ou d'une réactivation refusé par l'API. */
  protected readonly actionError = signal<string | null>(null);

  protected openCreate(): void {
    this.editing.set(null);
    this.dialogState.set('open');
  }

  protected openEdit(article: ArticleRow): void {
    this.editing.set(article);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.articles.reload();
  }

  /** Réversible et sans perte : pas de confirmation. */
  protected async toggleActive(article: ArticleRow): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.setArticleActive(article.id, !article.active);
      this.articles.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }

  // ---------- Filtres et pagination : ils ne font que changer l'URL ----------

  protected setFilter(name: 'q' | 'categorie' | 'archives', value: string): void {
    this.router.navigate([], {
      queryParams: { [name]: value.trim() || null, page: null },
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
