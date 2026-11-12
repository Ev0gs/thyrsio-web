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
import { CloseForm } from '../close-form/close-form';
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
    BottlingStateBadge,
    CloseForm,
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
  protected readonly canClose = computed(() => {
    const bottling = this.bottling();
    return !!bottling && bottling.status === 'PLANNED' && bottling.startDate <= todayLocal();
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
