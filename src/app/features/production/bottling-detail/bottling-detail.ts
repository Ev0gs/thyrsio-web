import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronLeft,
  lucideCircleCheck,
  lucidePencil,
  lucideRotateCw,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal } from '../../../core/dates';
import { WineLabel } from '../../cuverie/wine-label/wine-label';
import { BottlingForm } from '../bottling-form/bottling-form';
import { BottlingStateBadge } from '../bottling-state-badge/bottling-state-badge';
import { FEATURES } from '../../../core/features';
import { WineColor } from '../../cuverie/cuverie.models';
import { BottleIllustration } from '../bottle-illustration/bottle-illustration';
import { CloseForm } from '../close-form/close-form';
import { WineGlassIllustration } from '../wine-glass-illustration/wine-glass-illustration';
import { ProductionApi } from '../production-api';
import { Bottling, BOTTLING_LOCATION_LABELS } from '../production.models';

type DialogKind = 'edit' | 'close' | 'cancel';

/** La fiche d'une mise : le planning, les matières et leurs manquants, puis le réel une fois clôturée. */
@Component({
  selector: 'app-bottling-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    BottlingForm,
    BottleIllustration,
    BottlingStateBadge,
    CloseForm,
    WineGlassIllustration,
    WineLabel,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({ lucideBan, lucideChevronLeft, lucideCircleCheck, lucidePencil, lucideRotateCw }),
  ],
  templateUrl: './bottling-detail.html',
})
export class BottlingDetail {
  private readonly api = inject(ProductionApi);

  readonly id = input.required<string>();

  /** La section « Commandes servies » : seulement si les ventes sont affichées. */
  protected readonly sales = FEATURES.sales;

  protected readonly locationLabels = BOTTLING_LOCATION_LABELS;

  protected readonly resource = httpResource<Bottling>(
    () => `/api/production/bottlings/${this.id()}`,
  );
  protected readonly bottling = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly dialog = signal<DialogKind | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** Une mise ne se clôture qu'une fois commencée. */
  /** Les bouteilles qui ne sont réservées à aucune commande. */
  protected readonly allocatedFree = computed(() => {
    const b = this.bottling();
    if (!b) return 0;
    const total = b.producedBottles ?? b.plannedBottles;
    return Math.max(0, total - b.allocations.reduce((sum, a) => sum + a.quantity, 0));
  });

  protected readonly canClose = computed(() => {
    const bottling = this.bottling();
    return !!bottling && bottling.status === 'PLANNED' && bottling.startDate <= todayLocal();
  });

  /**
   * La couleur du vin, pour les dessins : celle du lot en cuve ; chez le producteur,
   * devinée d'après la description du vin ou le nom du produit (« Bordeaux Blanc »…).
   */
  protected readonly wineColor = computed<WineColor>(() => {
    const bottling = this.bottling();
    if (bottling?.wineLot) {
      return bottling.wineLot.color;
    }
    const text =
      `${bottling?.wineDescription ?? ''} ${bottling?.finishedArticleLabel ?? ''}`.toLowerCase();
    return /ros[ée]/.test(text) ? 'ROSE' : /blanc/.test(text) ? 'WHITE' : 'RED';
  });

  protected readonly wineShort = computed(() => {
    const bottling = this.bottling();
    return (
      !!bottling &&
      bottling.status === 'PLANNED' &&
      bottling.tankVolumeHl !== null &&
      bottling.tankVolumeHl < bottling.wineNeededHl
    );
  });

  protected open(kind: DialogKind): void {
    this.actionError.set(null);
    this.dialog.set(kind);
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.resource.reload();
  }

  protected async cancel(): Promise<void> {
    this.busy.set(true);
    try {
      await this.api.cancelBottling(this.id());
      this.dialog.set(null);
      this.resource.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
