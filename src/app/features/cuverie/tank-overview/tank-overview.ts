import { Component, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeftRight,
  lucidePlus,
  lucideRotateCw,
  lucideSearch,
  lucideTruck,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { fillPercent, roundHl, Tank, TankState } from '../cuverie.models';
import { ReceptionForm } from '../reception-form/reception-form';
import { TankForm } from '../tank-form/tank-form';
import { TankIllustration } from '../tank-illustration/tank-illustration';
import { TankStateBadge } from '../tank-state-badge/tank-state-badge';
import { TransferForm } from '../transfer-form/transfer-form';
import { WineLabel } from '../wine-label/wine-label';

type StateFilter = 'all' | 'inUse' | 'empty' | 'unavailable';
type DialogKind = 'reception' | 'transfer' | 'tank';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const MATCHES: Record<StateFilter, (state: TankState) => boolean> = {
  all: () => true,
  inUse: (state) => state === 'IN_USE',
  empty: (state) => state === 'EMPTY',
  unavailable: (state) => state === 'CLEANING' || state === 'OUT_OF_SERVICE',
};

/** La vue de la cuverie : toutes les cuves, leur contenu et leur remplissage. */
@Component({
  selector: 'app-tank-overview',
  imports: [
    DecimalPipe,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    ReceptionForm,
    TankForm,
    TankIllustration,
    TankStateBadge,
    TransferForm,
    WineLabel,
  ],
  viewProviders: [
    provideIcons({ lucideArrowLeftRight, lucidePlus, lucideRotateCw, lucideSearch, lucideTruck }),
  ],
  templateUrl: './tank-overview.html',
})
export class TankOverview {
  /** Un seul appel : toutes les cuves avec leur contenu. Le filtrage se fait ici. */
  protected readonly tankResource = httpResource<Tank[]>(() => '/api/cuverie/tanks');

  protected readonly search = signal('');
  protected readonly stateFilter = signal<StateFilter>('all');
  protected readonly dialog = signal<DialogKind | null>(null);

  protected readonly tanks = computed(() =>
    this.tankResource.hasValue() ? this.tankResource.value() : [],
  );

  protected readonly stats = computed(() => {
    const tanks = this.tanks();
    const capacity = tanks.reduce((sum, tank) => sum + tank.capacityHl, 0);
    const volume = tanks.reduce((sum, tank) => sum + tank.volumeHl, 0);
    return {
      volume: roundHl(volume),
      capacity: roundHl(capacity),
      fill: capacity > 0 ? (volume / capacity) * 100 : 0,
      empty: tanks.filter((tank) => tank.state === 'EMPTY').length,
      inUse: tanks.filter((tank) => tank.state === 'IN_USE').length,
      unavailable: tanks.filter((tank) => MATCHES.unavailable(tank.state)).length,
      lots: new Set(tanks.flatMap((tank) => (tank.wineLot ? [tank.wineLot.id] : []))).size,
    };
  });

  protected readonly stateFilters = computed(() => [
    { value: 'all' as const, label: 'Toutes', count: this.tanks().length },
    { value: 'inUse' as const, label: 'Occupées', count: this.stats().inUse },
    { value: 'empty' as const, label: 'Vides', count: this.stats().empty },
    { value: 'unavailable' as const, label: 'Indisponibles', count: this.stats().unavailable },
  ]);

  protected readonly fill = (tank: Tank) => fillPercent(tank.volumeHl, tank.capacityHl);

  protected readonly filtered = computed(() => {
    const query = normalize(this.search());
    const matches = MATCHES[this.stateFilter()];
    return this.tanks().filter((tank) => {
      const text = [
        tank.code,
        tank.label,
        tank.wineLot?.code,
        tank.wineLot?.appellation,
        tank.wineLot?.vintage,
      ]
        .filter(Boolean)
        .join(' ');
      return matches(tank.state) && (!query || normalize(text).includes(query));
    });
  });

  protected open(kind: DialogKind): void {
    this.dialog.set(kind);
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.tankResource.reload();
  }
}
