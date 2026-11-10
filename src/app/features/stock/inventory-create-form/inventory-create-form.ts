import { Component, inject, output, signal } from '@angular/core';
import { form, FormField, maxLength, required, submit, validate } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { StockApi } from '../stock-api';
import { Inventory } from '../stock.models';

@Component({
  selector: 'app-inventory-create-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './inventory-create-form.html',
})
export class InventoryCreateForm {
  readonly created = output<Inventory>();
  readonly cancelled = output<void>();

  private readonly api = inject(StockApi);

  protected readonly model = signal({
    label: `Inventaire du ${new Date().toLocaleDateString('fr-FR')}`,
    countedOn: todayLocal(),
    prefill: true,
    notes: '',
  });

  protected readonly createForm = form(this.model, (path) => {
    required(path.label, { message: 'Donne un nom à cet inventaire' });
    maxLength(path.label, 100, { message: '100 caractères au maximum' });
    required(path.countedOn, { message: 'Indique la date du comptage' });
    validate(path.countedOn, ({ value }) =>
      value() > todayLocal() ? { kind: 'future', message: 'La date ne peut pas être dans le futur' } : undefined,
    );
  });

  protected async save(): Promise<void> {
    await submit(this.createForm, {
      action: async () => {
        const value = this.model();
        try {
          const inventory = await this.api.createInventory({
            label: value.label.trim(),
            countedAt: toInstant(value.countedOn),
            notes: value.notes.trim() || null,
            prefill: value.prefill,
          });
          this.created.emit(inventory);
          return undefined;
        } catch (error) {
          return { fieldTree: this.createForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
