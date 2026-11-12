import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { Page } from '../../core/api/page';
import { CurrentUser } from '../../core/auth/current-user';
import { StockStatusBadge } from '../stock/stock-status-badge/stock-status-badge';
import { MOVEMENT_TYPE_LABELS, MovementRow, StockOverviewRow } from '../stock/stock.models';
import { roundHl, Tank } from '../cuverie/cuverie.models';

const DAY_MS = 24 * 60 * 60 * 1000;

@Component({
  selector: 'app-dashboard',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    StockStatusBadge,
    HlmBadgeImports,
    HlmButtonImports,
    HlmSkeletonImports,
  ],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly user = inject(CurrentUser);
  protected readonly today = new Date();
  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;

  /** Les indicateurs des modules pas encore développés côté API. */
  protected readonly upcomingKpis = [
    { label: 'Mises cette semaine', hint: 'Avec le module Production' },
    { label: 'Commandes à charger', hint: 'Avec le module Commandes clients' },
  ];

  // ---------- Les appels à l'API, lancés en parallèle ----------

  protected readonly overview = httpResource<StockOverviewRow[]>(() => '/api/stock/overview');

  protected readonly recentMovements = httpResource<Page<MovementRow>>(() => ({
    url: '/api/stock/movements',
    params: { size: 6 },
  }));

  protected readonly tanks = httpResource<Tank[]>(() => '/api/cuverie/tanks');

  private readonly since = new Date(Date.now() - 30 * DAY_MS).toISOString();

  protected readonly consumptions = httpResource<Page<MovementRow>>(() => ({
    url: '/api/stock/movements',
    params: { type: 'CONSUMPTION', from: this.since, size: 1000 },
  }));

  // ---------- Ce que l'écran affiche, calculé à partir de ces données ----------

  protected readonly firstName = computed(() => this.user.name.split(/\s+/)[0] ?? '');

  private readonly rows = computed(() => (this.overview.hasValue() ? this.overview.value() : []));

  /** Les articles indexés par id : pour retrouver libellé et catégorie d'un mouvement. */
  private readonly articlesById = computed(
    () => new Map(this.rows().map((row) => [row.articleId, row])),
  );

  protected readonly belowCount = computed(
    () => this.rows().filter((row) => row.status === 'BELOW_THRESHOLD').length,
  );
  protected readonly outCount = computed(
    () => this.rows().filter((row) => row.status === 'OUT_OF_STOCK').length,
  );

  /** La cuverie en deux chiffres : le vin en cuve et les cuves prêtes à recevoir. */
  protected readonly cellar = computed(() => {
    const tanks = this.tanks.hasValue() ? this.tanks.value() : [];
    const capacity = tanks.reduce((sum, tank) => sum + tank.capacityHl, 0);
    const volume = tanks.reduce((sum, tank) => sum + tank.volumeHl, 0);
    return {
      volume: roundHl(volume),
      fill: capacity > 0 ? (volume / capacity) * 100 : 0,
      empty: tanks.filter((tank) => tank.state === 'EMPTY').length,
      total: tanks.length,
    };
  });

  /** Les 5 articles les plus critiques : la part du seuil encore en stock, du plus bas au plus haut. */
  protected readonly alerts = computed(() =>
    this.rows()
      .filter((row) => row.status !== 'OK')
      .map((row) => ({
        ...row,
        fill: row.alertThreshold ? Math.min(100, (row.quantity / row.alertThreshold) * 100) : 0,
      }))
      .sort((a, b) => a.fill - b.fill)
      .slice(0, 5),
  );

  /** Le total consommé par catégorie sur 30 jours, avec la largeur de chaque barre (la plus grande = 100 %). */
  protected readonly consumptionByCategory = computed(() => {
    if (!this.consumptions.hasValue()) {
      return [];
    }
    const totals = new Map<string, number>();
    for (const movement of this.consumptions.value().content) {
      const category = this.articlesById().get(movement.articleId)?.categoryLabel ?? 'Autre';
      // Une consommation est négative dans l'API : on l'additionne en positif
      totals.set(category, (totals.get(category) ?? 0) - movement.quantity);
    }
    const max = Math.max(1, ...totals.values());
    return [...totals]
      .map(([label, total]) => ({ label, total, width: (total / max) * 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  });

  /** Les derniers mouvements, avec le libellé de l'article plutôt que son seul code. */
  protected readonly movements = computed(() => {
    if (!this.recentMovements.hasValue()) {
      return [];
    }
    return this.recentMovements.value().content.map((movement) => ({
      ...movement,
      articleLabel:
        this.articlesById().get(movement.articleId)?.articleLabel ?? movement.articleCode,
    }));
  });
}
