import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideFlaskConical,
  lucidePencil,
  lucideRotateCw,
  lucideTrash2,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { AnalysisForm } from '../analysis-form/analysis-form';
import { CuverieApi } from '../cuverie-api';
import {
  describeWine,
  TANK_MOVEMENT_TYPE_LABELS,
  TankMovement,
  WINE_COLOR_LABELS,
  WineAnalysis,
  WineLot,
} from '../cuverie.models';
import { TankGauge } from '../tank-gauge/tank-gauge';
import { WineLotForm } from '../wine-lot-form/wine-lot-form';

type DialogKind = 'analysis' | 'edit';

/** La fiche d'un lot de vin : son origine, les cuves qui le contiennent, ses analyses et son parcours. */
@Component({
  selector: 'app-wine-lot-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    AnalysisForm,
    TankGauge,
    WineLotForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideFlaskConical,
      lucidePencil,
      lucideRotateCw,
      lucideTrash2,
    }),
  ],
  templateUrl: './wine-lot-detail.html',
})
export class WineLotDetail {
  private readonly api = inject(CuverieApi);

  readonly id = input.required<string>();

  protected readonly typeLabels = TANK_MOVEMENT_TYPE_LABELS;
  protected readonly colorLabels = WINE_COLOR_LABELS;
  protected readonly describeWine = describeWine;

  protected readonly lotResource = httpResource<WineLot>(
    () => `/api/cuverie/wine-lots/${this.id()}`,
  );
  protected readonly analyses = httpResource<WineAnalysis[]>(
    () => `/api/cuverie/wine-lots/${this.id()}/analyses`,
  );
  /** Le parcours complet du lot : il tient en une page (quelques dizaines de mouvements au plus). */
  protected readonly movements = httpResource<Page<TankMovement>>(() => ({
    url: '/api/cuverie/movements',
    params: { wineLotId: this.id(), size: 200 },
  }));

  protected readonly lot = computed(() =>
    this.lotResource.hasValue() ? this.lotResource.value() : null,
  );

  protected readonly dialog = signal<DialogKind | null>(null);
  protected readonly actionError = signal<string | null>(null);

  /** Ce qui a été reçu : la somme des réceptions du lot. */
  protected readonly receivedHl = computed(() =>
    (this.movements.hasValue() ? this.movements.value().content : [])
      .filter((movement) => movement.type === 'RECEPTION')
      .reduce((sum, movement) => sum + movement.volumeHl, 0),
  );

  protected open(kind: DialogKind): void {
    this.dialog.set(kind);
  }

  protected onLotSaved(): void {
    this.dialog.set(null);
    this.lotResource.reload();
  }

  protected onAnalysisSaved(): void {
    this.dialog.set(null);
    this.analyses.reload();
  }

  protected async deleteAnalysis(analysis: WineAnalysis): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.deleteAnalysis(analysis.id);
      this.analyses.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }
}
