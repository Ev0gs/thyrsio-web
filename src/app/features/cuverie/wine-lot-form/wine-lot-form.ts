import { Component, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { CuverieApi } from '../cuverie-api';
import { WINE_COLOR_LABELS, WINE_COLORS, WineLot } from '../cuverie.models';

const toModel = (lot: WineLot) => ({
  appellation: lot.appellation,
  color: lot.color,
  vintage: lot.vintage,
  alcohol: lot.alcohol,
  supplierLotNumber: lot.supplierLotNumber ?? '',
  daeNumber: lot.daeNumber ?? '',
  pricePerHl: lot.pricePerHl,
  notes: lot.notes ?? '',
});

/** Corriger la fiche d'un lot. Le code, le fournisseur et la date de réception ne changent pas. */
@Component({
  selector: 'app-wine-lot-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]">
        <div class="flex flex-col gap-1.5">
          <label for="wl-appellation" class="text-sm font-medium">Appellation</label>
          <input id="wl-appellation" hlmInput [formField]="lotForm.appellation" />
          <app-field-error [state]="lotForm.appellation()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="wl-color" class="text-sm font-medium">Couleur</label>
          <select id="wl-color" [formField]="lotForm.color" [class]="selectClass">
            @for (color of colors; track color) {
              <option [value]="color">{{ colorLabels[color] }}</option>
            }
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="wl-vintage" class="text-sm font-medium">Millésime</label>
          <input id="wl-vintage" hlmInput type="number" step="1" [formField]="lotForm.vintage" />
          <app-field-error [state]="lotForm.vintage()" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label for="wl-alcohol" class="text-sm font-medium"
            >Degré <span class="font-normal text-muted-foreground">(% vol.)</span></label
          >
          <input id="wl-alcohol" hlmInput type="number" step="0.01" [formField]="lotForm.alcohol" />
          <app-field-error [state]="lotForm.alcohol()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="wl-price" class="text-sm font-medium"
            >Prix <span class="font-normal text-muted-foreground">(€/hl)</span></label
          >
          <input
            id="wl-price"
            hlmInput
            type="number"
            step="0.01"
            [formField]="lotForm.pricePerHl"
          />
          <app-field-error [state]="lotForm.pricePerHl()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="wl-supplier-lot" class="text-sm font-medium">N° de lot du vendeur</label>
          <input id="wl-supplier-lot" hlmInput [formField]="lotForm.supplierLotNumber" />
          <app-field-error [state]="lotForm.supplierLotNumber()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="wl-dae" class="text-sm font-medium">N° de DAE</label>
          <input id="wl-dae" hlmInput [formField]="lotForm.daeNumber" />
          <app-field-error [state]="lotForm.daeNumber()" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="wl-notes" class="text-sm font-medium">Notes</label>
        <textarea
          id="wl-notes"
          hlmInput
          rows="2"
          class="h-auto py-2"
          [formField]="lotForm.notes"
        ></textarea>
        <app-field-error [state]="lotForm.notes()" />
      </div>

      @for (error of lotForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="lotForm().submitting()">
          {{ lotForm().submitting() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class WineLotForm {
  readonly lot = input.required<WineLot>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly colors = WINE_COLORS;
  protected readonly colorLabels = WINE_COLOR_LABELS;

  protected readonly model = linkedSignal(() => toModel(this.lot()));

  protected readonly lotForm = form(this.model, (path) => {
    required(path.appellation, { message: "Indique l'appellation" });
    maxLength(path.appellation, 200, { message: '200 caractères au maximum' });
    min(path.vintage, 1900, { message: 'Millésime invalide' });
    max(path.vintage, 2100, { message: 'Millésime invalide' });
    min(path.alcohol, 0, { message: 'Degré invalide' });
    max(path.alcohol, 25, { message: 'Degré invalide' });
    min(path.pricePerHl, 0, { message: 'Le prix ne peut pas être négatif' });
    maxLength(path.supplierLotNumber, 100, { message: '100 caractères au maximum' });
    maxLength(path.daeNumber, 100, { message: '100 caractères au maximum' });
    maxLength(path.notes, 1000, { message: '1000 caractères au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.lotForm, {
      action: async () => {
        const value = this.model();
        try {
          await this.api.updateWineLot(this.lot().id, {
            appellation: value.appellation.trim(),
            color: value.color,
            vintage: value.vintage,
            alcohol: value.alcohol,
            supplierLotNumber: value.supplierLotNumber.trim() || null,
            daeNumber: value.daeNumber.trim() || null,
            pricePerHl: value.pricePerHl,
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.lotForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
