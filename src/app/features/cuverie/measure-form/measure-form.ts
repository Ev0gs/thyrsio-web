import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  form,
  FormField,
  hidden,
  maxLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { CuverieApi } from '../cuverie-api';
import { describeWine, roundHl, Tank, WineLotRow } from '../cuverie.models';

/**
 * Un jaugeage : on saisit le volume mesuré, l'application calcule l'écart.
 * Pour une cuve vide dans l'application mais pleine en vrai, on précise quel vin elle contient.
 */
@Component({
  selector: 'app-measure-form',
  imports: [
    DecimalPipe,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      <p class="text-sm text-muted-foreground">
        Volume enregistré dans {{ tank().code }} :
        <span class="font-medium tabular-nums text-foreground"
          >{{ tank().volumeHl | number: '1.0-2' }} hl</span
        >
        sur {{ tank().capacityHl | number: '1.0-2' }} hl.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label for="ms-volume" class="text-sm font-medium"
            >Volume mesuré <span class="font-normal text-muted-foreground">(hl)</span></label
          >
          <input
            id="ms-volume"
            hlmInput
            type="number"
            step="0.01"
            [formField]="measureForm.measuredHl"
          />
          <app-field-error [state]="measureForm.measuredHl()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="ms-date" class="text-sm font-medium">Date</label>
          <input id="ms-date" hlmInput type="date" [formField]="measureForm.occurredOn" />
          <app-field-error [state]="measureForm.occurredOn()" />
        </div>
      </div>

      @if (delta() !== null) {
        <p class="rounded-md bg-muted/60 px-3 py-2 text-sm">
          Écart enregistré :
          <span
            class="font-semibold tabular-nums"
            [class.text-emerald-700]="delta()! > 0"
            [class.text-destructive]="delta()! < 0"
          >
            {{ delta()! > 0 ? '+' : '' }}{{ delta() | number: '1.0-2' }} hl
          </span>
        </p>
      }

      @if (!measureForm.wineLotId().hidden()) {
        <div class="flex flex-col gap-1.5">
          <label for="ms-lot" class="text-sm font-medium">Vin contenu dans la cuve</label>
          <select id="ms-lot" [formField]="measureForm.wineLotId" [class]="selectClass">
            <option value="">Choisir un lot de vin…</option>
            @for (lot of lotOptions(); track lot.id) {
              <option [value]="lot.id">{{ lot.code }} · {{ describeWine(lot) }}</option>
            }
          </select>
          <p class="text-xs text-muted-foreground">
            La cuve est vide dans l'application : indique quel vin tu y as trouvé.
          </p>
          <app-field-error [state]="measureForm.wineLotId()" />
        </div>
      }

      <div class="flex flex-col gap-1.5">
        <label for="ms-notes" class="text-sm font-medium"
          >Notes <span class="font-normal text-muted-foreground">(facultatif)</span></label
        >
        <input id="ms-notes" hlmInput [formField]="measureForm.notes" />
        <app-field-error [state]="measureForm.notes()" />
      </div>

      @for (error of measureForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="measureForm().submitting()">
          {{ measureForm().submitting() ? 'Enregistrement…' : "Enregistrer l'ajustement" }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class MeasureForm {
  readonly tank = input.required<Tank>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly describeWine = describeWine;

  protected readonly model = signal({
    measuredHl: null as number | null,
    wineLotId: '',
    occurredOn: todayLocal(),
    notes: '',
  });

  /** Les lots récents : seulement si la cuve est vide (sinon, pas d'appel). */
  private readonly lots = httpResource<Page<WineLotRow>>(() =>
    this.tank().volumeHl === 0
      ? { url: '/api/cuverie/wine-lots', params: { size: 100 } }
      : undefined,
  );

  protected readonly lotOptions = computed(() =>
    this.lots.hasValue() ? this.lots.value().content : [],
  );

  protected readonly delta = computed(() => {
    const measured = this.model().measuredHl;
    return measured === null ? null : roundHl(measured - this.tank().volumeHl);
  });

  protected readonly measureForm = form(this.model, (path) => {
    required(path.measuredHl, { message: 'Indique le volume mesuré' });
    validate(path.measuredHl, ({ value }) => {
      const measured = value();
      if (measured === null) {
        return undefined;
      }
      if (measured < 0) {
        return { kind: 'negative', message: 'Le volume ne peut pas être négatif' };
      }
      if (Math.round(measured * 100) !== measured * 100) {
        return { kind: 'decimals', message: '2 décimales au maximum' };
      }
      if (measured > this.tank().capacityHl) {
        return {
          kind: 'capacity',
          message: `La cuve ne contient que ${this.tank().capacityHl} hl au maximum`,
        };
      }
      return measured === this.tank().volumeHl
        ? {
            kind: 'same',
            message: 'Le volume mesuré est égal au volume enregistré : rien à ajuster',
          }
        : undefined;
    });
    hidden(path.wineLotId, { when: () => this.tank().volumeHl > 0 });
    required(path.wineLotId, {
      message: 'Choisis le vin que contient la cuve',
      when: ({ valueOf }) => this.tank().volumeHl === 0 && (valueOf(path.measuredHl) ?? 0) > 0,
    });
    required(path.occurredOn, { message: 'Indique la date' });
    validate(path.occurredOn, ({ value }) =>
      value() > todayLocal()
        ? { kind: 'future', message: 'La date ne peut pas être dans le futur' }
        : undefined,
    );
    maxLength(path.notes, 1000, { message: '1000 caractères au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.measureForm, {
      action: async () => {
        const value = this.model();
        try {
          await this.api.measure(this.tank().id, {
            measuredHl: value.measuredHl!,
            wineLotId: this.tank().volumeHl === 0 ? value.wineLotId || null : null,
            occurredAt: toInstant(value.occurredOn),
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.measureForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
