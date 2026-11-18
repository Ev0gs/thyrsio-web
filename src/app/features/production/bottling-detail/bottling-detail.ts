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
import { FEATURES } from '../../../core/features';
import { WineColor } from '../../cuverie/cuverie.models';
import { WineLabel } from '../../cuverie/wine-label/wine-label';
import { BottleIllustration } from '../bottle-illustration/bottle-illustration';
import { BottlingForm } from '../bottling-form/bottling-form';
import { BottlingStateBadge } from '../bottling-state-badge/bottling-state-badge';
import { CloseForm } from '../close-form/close-form';
import { ProductionApi } from '../production-api';
import {
  Bottling,
  BOTTLING_LOCATION_LABELS,
  bottlingHeading,
  Production,
  PRODUCTION_SLOT_LABELS,
} from '../production.models';
import { WineGlassIllustration } from '../wine-glass-illustration/wine-glass-illustration';

type Dialog =
  | { kind: 'edit' }
  | { kind: 'cancel' }
  | { kind: 'close'; production: Production }
  | { kind: 'cancelProduction'; production: Production };

/**
 * La fiche d'une mise : ses productions, chacune avec son numéro de lot, son vin et ses matières
 * (et leurs manquants), puis son réel une fois clôturée. Chaque production se clôture seule.
 */
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

  /** Les commandes servies : seulement si les ventes sont affichées. */
  protected readonly sales = FEATURES.sales;

  protected readonly locationLabels = BOTTLING_LOCATION_LABELS;
  protected readonly slotLabels = PRODUCTION_SLOT_LABELS;
  protected readonly title = bottlingHeading;

  protected readonly resource = httpResource<Bottling>(
    () => `/api/production/bottlings/${this.id()}`,
  );
  protected readonly bottling = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  /** Planifiée ou en cours : il reste des productions à faire, la mise se modifie encore. */
  protected readonly open = computed(() => {
    const status = this.bottling()?.status;
    return status === 'PLANNED' || status === 'IN_PROGRESS';
  });

  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** Une production ne se clôture qu'une fois commencée. */
  protected canClose(production: Production): boolean {
    return production.status === 'PLANNED' && production.startDate <= todayLocal();
  }

  /**
   * La couleur du vin, pour les dessins : celle du lot en cuve ; chez le producteur,
   * devinée d'après la description du vin ou le nom du produit (« Bordeaux Blanc »…).
   */
  protected wineColor(production: Production): WineColor {
    if (production.wineLot) {
      return production.wineLot.color;
    }
    const text =
      `${production.wineDescription ?? ''} ${production.finishedArticleLabel}`.toLowerCase();
    return /ros[ée]/.test(text) ? 'ROSE' : /blanc/.test(text) ? 'WHITE' : 'RED';
  }

  protected wineShort(production: Production): boolean {
    return (
      production.status === 'PLANNED' &&
      production.tankVolumeHl !== null &&
      production.tankVolumeHl < production.wineNeededHl
    );
  }

  /** Les bouteilles qui ne sont réservées à aucune commande. */
  protected freeBottles(production: Production): number {
    const total = production.producedBottles ?? production.plannedBottles;
    return Math.max(0, total - production.allocations.reduce((sum, a) => sum + a.quantity, 0));
  }

  protected openDialog(dialog: Dialog): void {
    this.actionError.set(null);
    this.dialog.set(dialog);
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.resource.reload();
  }

  protected async cancel(): Promise<void> {
    await this.run(() => this.api.cancelBottling(this.id()));
  }

  protected async cancelProduction(production: Production): Promise<void> {
    await this.run(() => this.api.cancelProduction(this.id(), production.id));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      this.dialog.set(null);
      this.resource.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
