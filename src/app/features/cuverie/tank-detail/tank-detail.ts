import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucideChevronLeft,
  lucideDroplets,
  lucidePencil,
  lucideRotateCw,
  lucideRuler,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { CuverieApi } from '../cuverie-api';
import {
  fillPercent,
  Tank,
  TANK_MOVEMENT_TYPE_LABELS,
  TANK_STATUS_LABELS,
  TankMovement,
  TankStatus,
} from '../cuverie.models';
import { LossForm } from '../loss-form/loss-form';
import { MeasureForm } from '../measure-form/measure-form';
import { TankForm } from '../tank-form/tank-form';
import { TankIllustration } from '../tank-illustration/tank-illustration';
import { TankStateBadge } from '../tank-state-badge/tank-state-badge';
import { TransferForm } from '../transfer-form/transfer-form';
import { WineLabel } from '../wine-label/wine-label';

type DialogKind = 'loss' | 'measure' | 'transfer' | 'edit';

const PAGE_SIZE = 20;

/** La fiche d'une cuve : son contenu, les actions possibles et son historique. */
@Component({
  selector: 'app-tank-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
    LossForm,
    MeasureForm,
    TankForm,
    TankIllustration,
    TankStateBadge,
    TransferForm,
    WineLabel,
  ],
  viewProviders: [
    provideIcons({
      lucideArrowLeftRight,
      lucideChevronLeft,
      lucideDroplets,
      lucidePencil,
      lucideRotateCw,
      lucideRuler,
    }),
  ],
  templateUrl: './tank-detail.html',
})
export class TankDetail {
  private readonly api = inject(CuverieApi);
  private readonly router = inject(Router);

  /** :id dans l'URL. */
  readonly id = input.required<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly typeLabels = TANK_MOVEMENT_TYPE_LABELS;
  protected readonly statusLabels = TANK_STATUS_LABELS;

  protected readonly tankResource = httpResource<Tank>(() => `/api/cuverie/tanks/${this.id()}`);

  /** Toutes les cuves : le formulaire de transfert en a besoin pour proposer les destinations. */
  protected readonly allTanks = httpResource<Tank[]>(() => '/api/cuverie/tanks');

  protected readonly movements = httpResource<Page<TankMovement>>(() => ({
    url: '/api/cuverie/movements',
    params: { tankId: this.id(), page: this.page() - 1, size: PAGE_SIZE },
  }));

  protected readonly dialog = signal<DialogKind | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly tank = computed(() =>
    this.tankResource.hasValue() ? this.tankResource.value() : null,
  );
  protected readonly fill = computed(() => {
    const tank = this.tank();
    return tank ? fillPercent(tank.volumeHl, tank.capacityHl) : 0;
  });
  /** La place libre, parlée en bouteilles de 75 cl (1 hl = 133 bouteilles). */
  protected readonly freeBottles = computed(() =>
    Math.floor(((this.tank()?.freeSpaceHl ?? 0) * 100) / 0.75),
  );
  protected readonly tanks = computed(() =>
    this.allTanks.hasValue() ? this.allTanks.value() : [],
  );

  /** Les changements de statut proposés, selon l'état actuel. */
  protected readonly statusActions = computed(() => {
    const tank = this.tank();
    if (!tank || !tank.active) {
      return [];
    }
    const targets: TankStatus[] = (
      ['IN_SERVICE', 'CLEANING', 'OUT_OF_SERVICE'] as TankStatus[]
    ).filter((status) => status !== tank.status);
    const labels: Record<TankStatus, string> = {
      IN_SERVICE: 'Remettre en service',
      CLEANING: 'Mettre en nettoyage',
      OUT_OF_SERVICE: 'Mettre hors service',
    };
    // Une cuve pleine ne peut pas passer en nettoyage ou hors service : on ne le propose pas
    return targets
      .filter((status) => status === 'IN_SERVICE' || tank.volumeHl === 0)
      .map((status) => ({ status, label: labels[status] }));
  });

  protected open(kind: DialogKind): void {
    this.actionError.set(null);
    this.dialog.set(kind);
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.reloadAll();
  }

  protected async changeStatus(status: TankStatus): Promise<void> {
    await this.run(() => this.api.changeTankStatus(this.id(), status));
  }

  protected async toggleActive(tank: Tank): Promise<void> {
    await this.run(() => this.api.setTankActive(tank.id, !tank.active));
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  /** Une action directe (sans formulaire) : l'erreur de l'API s'affiche au-dessus de la fiche. */
  private async run(action: () => Promise<unknown>): Promise<void> {
    this.actionError.set(null);
    this.busy.set(true);
    try {
      await action();
      this.reloadAll();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private reloadAll(): void {
    this.tankResource.reload();
    this.allTanks.reload();
    this.movements.reload();
  }
}
