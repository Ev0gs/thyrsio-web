import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import {
  applyWhen,
  form,
  FormField,
  hidden,
  max,
  maxLength,
  min,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { ReferentielApi } from '../referentiel-api';
import { UnitRow } from '../referentiel.models';

interface UnitModel {
  code: string;
  label: string;
  decimals: number | null;
}

/**
 * Créer une unité, ou renommer une unité existante.
 * Le code et le nombre de décimales sont définitifs : des quantités en stock en dépendent.
 */
@Component({
  selector: 'app-unit-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './unit-form.html',
})
export class UnitForm {
  /** null : nouvelle unité ; une unité : modification de son libellé. */
  readonly unit = input<UnitRow | null>(null);
  readonly saved = output<UnitRow>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly isEdit = computed(() => this.unit() !== null);

  protected readonly model = linkedSignal<UnitModel>(() => ({
    code: this.unit()?.code ?? '',
    label: this.unit()?.label ?? '',
    decimals: this.unit()?.decimals ?? 0,
  }));

  protected readonly unitForm = form(this.model, (path) => {
    hidden(path.code, { when: () => this.isEdit() });
    hidden(path.decimals, { when: () => this.isEdit() });
    applyWhen(
      path.code,
      () => !this.isEdit(),
      (code) => {
        required(code, { message: 'Indique un code' });
        maxLength(code, 10, { message: '10 caractères au maximum' });
        pattern(code, /^[A-Za-z0-9_]+$/, { message: 'Lettres, chiffres et _ uniquement' });
      },
    );
    applyWhen(
      path.decimals,
      () => !this.isEdit(),
      (decimals) => {
        required(decimals, { message: 'Indique le nombre de décimales' });
        min(decimals, 0, { message: 'Entre 0 et 6' });
        max(decimals, 6, { message: 'Entre 0 et 6' });
      },
    );
    required(path.label, { message: 'Indique un libellé' });
    maxLength(path.label, 254, { message: '254 caractères au maximum' });
  });

  /** Un exemple de quantité avec ce nombre de décimales : « 12,500 kg ». */
  protected readonly example = computed(() => {
    const decimals = this.model().decimals ?? 0;
    const code = this.model().code.trim().toUpperCase() || 'U';
    return `${(12.5).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${code}`;
  });

  protected async save(): Promise<void> {
    await submit(this.unitForm, {
      action: async () => {
        const value = this.model();
        try {
          const current = this.unit();
          const saved = current
            ? await this.api.updateUnit(current.id, { label: value.label.trim() })
            : await this.api.createUnit({
                code: value.code.trim(),
                label: value.label.trim(),
                decimals: value.decimals!,
              });
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return { fieldTree: this.unitForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
