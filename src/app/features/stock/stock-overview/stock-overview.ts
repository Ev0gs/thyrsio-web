import { Component, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronRight, lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { ArticleLots } from '../article-lots/article-lots';
import { StockStatusBadge } from '../stock-status-badge/stock-status-badge';
import { StockOverviewRow } from '../stock.models';
import { MovementForm } from '../movement-form/movement-form';

type StateFilter = 'all' | 'alert' | 'lotTracked';

/** "Étiquette " → "etiquette" : la recherche ignore majuscules et accents. */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const isAlert = (row: StockOverviewRow) => row.status !== 'OK';

@Component({
  selector: 'app-stock-overview',
  imports: [
    DatePipe,
    DecimalPipe,
    NgIcon,
    ArticleLots,
    StockStatusBadge,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmDialogImports,
    MovementForm,
  ],
  viewProviders: [provideIcons({ lucideChevronRight, lucideRotateCw, lucideSearch })],
  templateUrl: './stock-overview.html',
})
export class StockOverview {
  /** Un seul appel : tous les articles avec leur stock. Le filtrage se fait ensuite ici. */
  protected readonly overview = httpResource<StockOverviewRow[]>(() => '/api/stock/overview');

  // L'état des filtres : des signaux, modifiés par le template
  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly stateFilter = signal<StateFilter>('all');
  protected readonly expandedId = signal<string | null>(null);

  protected readonly stateFilters: { value: StateFilter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'alert', label: 'Sous le seuil' },
    { value: 'lotTracked', label: 'Suivis par lot' },
  ];

  /** hasValue() d'abord : lire value() quand le chargement a échoué lève une erreur. */
  protected readonly rows = computed(() => (this.overview.hasValue() ? this.overview.value() : []));

  /** Les catégories proposées dans le filtre : celles des articles reçus, sans appel de plus. */
  protected readonly categories = computed(() => {
    const byCode = new Map<string, string>();
    for (const row of this.rows()) {
      byCode.set(row.categoryCode, row.categoryLabel);
    }
    return [...byCode]
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  });

  protected readonly alertCount = computed(() => this.rows().filter(isAlert).length);

  /** Recalculé à chaque changement d'un filtre ou des données : aucune requête. */
  protected readonly filtered = computed(() => {
    const query = normalize(this.search());
    const category = this.category();
    const state = this.stateFilter();
    return this.rows().filter(
      (row) =>
        (!category || row.categoryCode === category) &&
        (state !== 'alert' || isAlert(row)) &&
        (state !== 'lotTracked' || row.lotTracked) &&
        (!query || normalize(`${row.articleCode} ${row.articleLabel}`).includes(query)),
    );
  });

  /** On ne déplie que les articles suivis par lot qui ont au moins un lot en stock. */
  protected canExpand(row: StockOverviewRow): boolean {
    return row.lotTracked && row.lotsInStock > 0;
  }

  protected toggle(row: StockOverviewRow): void {
    if (this.canExpand(row)) {
      this.expandedId.update((id) => (id === row.articleId ? null : row.articleId));
    }
  }

  /** Après un mouvement enregistré : stock à jour, lignes dépliées refermées (leur détail est périmé). */
  protected onMovementSaved(): void {
    this.expandedId.set(null);
    this.overview.reload();
  }
}
