import { Component, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { UnitForm } from '../unit-form/unit-form';
import { UnitRow } from '../referentiel.models';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';

/** Les unités de mesure des articles et des quantités en stock (U, L, HL, KG…). */
@Component({
  selector: 'app-unit-list',
  imports: [
    PageIcon,
    NgIcon,
    UnitForm,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw })],
  templateUrl: './unit-list.html',
})
export class UnitList {
  protected readonly units = httpResource<UnitRow[]>(() => '/api/referentiel/units');
  protected readonly rows = computed(() =>
    (this.units.hasValue() ? this.units.value() : [])
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
  );

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  /** null : création ; une unité : modification de son libellé. */
  protected readonly editing = signal<UnitRow | null>(null);

  protected open(unit: UnitRow | null): void {
    this.editing.set(unit);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.units.reload();
  }
}
