import { Component, inject, input, output, signal } from '@angular/core';
import {
  form,
  FormField,
  max,
  maxLength,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { CuverieApi } from '../cuverie-api';
import { TankContent } from '../cuverie.models';

/** Une analyse de laboratoire : chaque valeur est facultative, on note ce qui a été mesuré. */
@Component({
  selector: 'app-analysis-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label for="an-date" class="text-sm font-medium">Date de l'analyse</label>
          <input id="an-date" hlmInput type="date" [formField]="analysisForm.analyzedOn" />
          <app-field-error [state]="analysisForm.analyzedOn()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="an-tank" class="text-sm font-medium"
            >Cuve prélevée
            <span class="font-normal text-muted-foreground">(facultatif)</span></label
          >
          <select id="an-tank" [formField]="analysisForm.tankId" [class]="selectClass">
            <option value="">Non précisée</option>
            @for (tank of tanks(); track tank.tankId) {
              <option [value]="tank.tankId">{{ tank.tankCode }}</option>
            }
          </select>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-1.5">
          <label for="an-alcohol" class="text-sm font-medium"
            >Degré <span class="font-normal text-muted-foreground">(% vol.)</span></label
          >
          <input
            id="an-alcohol"
            hlmInput
            type="number"
            step="0.01"
            [formField]="analysisForm.alcohol"
          />
          <app-field-error [state]="analysisForm.alcohol()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="an-free-so2" class="text-sm font-medium"
            >SO₂ libre <span class="font-normal text-muted-foreground">(mg/L)</span></label
          >
          <input
            id="an-free-so2"
            hlmInput
            type="number"
            step="0.1"
            [formField]="analysisForm.freeSo2"
          />
          <app-field-error [state]="analysisForm.freeSo2()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="an-total-so2" class="text-sm font-medium"
            >SO₂ total <span class="font-normal text-muted-foreground">(mg/L)</span></label
          >
          <input
            id="an-total-so2"
            hlmInput
            type="number"
            step="0.1"
            [formField]="analysisForm.totalSo2"
          />
          <app-field-error [state]="analysisForm.totalSo2()" />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="flex flex-col gap-1.5">
          <label for="an-ta" class="text-sm font-medium"
            >Acidité totale
            <span class="font-normal text-muted-foreground">(g/L H₂SO₄)</span></label
          >
          <input
            id="an-ta"
            hlmInput
            type="number"
            step="0.01"
            [formField]="analysisForm.totalAcidity"
          />
          <app-field-error [state]="analysisForm.totalAcidity()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="an-va" class="text-sm font-medium"
            >Acidité volatile
            <span class="font-normal text-muted-foreground">(g/L H₂SO₄)</span></label
          >
          <input
            id="an-va"
            hlmInput
            type="number"
            step="0.01"
            [formField]="analysisForm.volatileAcidity"
          />
          <app-field-error [state]="analysisForm.volatileAcidity()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="an-lab" class="text-sm font-medium">Laboratoire</label>
          <input id="an-lab" hlmInput [formField]="analysisForm.laboratory" />
          <app-field-error [state]="analysisForm.laboratory()" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="an-notes" class="text-sm font-medium"
          >Conclusions <span class="font-normal text-muted-foreground">(facultatif)</span></label
        >
        <textarea
          id="an-notes"
          hlmInput
          rows="2"
          class="h-auto py-2"
          placeholder="Filtration conseillée, sulfitage léger…"
          [formField]="analysisForm.notes"
        ></textarea>
        <app-field-error [state]="analysisForm.notes()" />
      </div>

      @for (error of analysisForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="analysisForm().submitting()">
          {{ analysisForm().submitting() ? 'Enregistrement…' : "Enregistrer l'analyse" }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class AnalysisForm {
  readonly wineLotId = input.required<string>();
  /** Les cuves qui contiennent le lot : celles qu'on a pu prélever. */
  readonly tanks = input<TankContent[]>([]);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly selectClass = SELECT_CLASS;

  protected readonly model = signal({
    analyzedOn: todayLocal(),
    tankId: '',
    alcohol: null as number | null,
    freeSo2: null as number | null,
    totalSo2: null as number | null,
    totalAcidity: null as number | null,
    volatileAcidity: null as number | null,
    laboratory: '',
    notes: '',
  });

  protected readonly analysisForm = form(this.model, (path) => {
    required(path.analyzedOn, { message: "Indique la date de l'analyse" });
    validate(path.analyzedOn, ({ value }) =>
      value() > todayLocal()
        ? { kind: 'future', message: 'La date ne peut pas être dans le futur' }
        : undefined,
    );
    min(path.alcohol, 0, { message: 'Valeur invalide' });
    max(path.alcohol, 25, { message: 'Valeur invalide' });
    min(path.freeSo2, 0, { message: 'Valeur invalide' });
    min(path.totalSo2, 0, { message: 'Valeur invalide' });
    min(path.totalAcidity, 0, { message: 'Valeur invalide' });
    min(path.volatileAcidity, 0, { message: 'Valeur invalide' });
    maxLength(path.laboratory, 200, { message: '200 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.analysisForm, {
      action: async () => {
        const value = this.model();
        try {
          await this.api.addAnalysis(this.wineLotId(), {
            tankId: value.tankId || null,
            analyzedOn: value.analyzedOn,
            alcohol: value.alcohol,
            freeSo2: value.freeSo2,
            totalSo2: value.totalSo2,
            totalAcidity: value.totalAcidity,
            volatileAcidity: value.volatileAcidity,
            laboratory: value.laboratory.trim() || null,
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          // "Saisissez au moins une valeur mesurée ou une note"
          return { fieldTree: this.analysisForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
