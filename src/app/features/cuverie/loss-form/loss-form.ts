import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, maxLength, required, submit, validate } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { CuverieApi } from '../cuverie-api';
import { Tank } from '../cuverie.models';

/** Une perte constatée dans une cuve : évaporation, fuite, lies retirées… */
@Component({
  selector: 'app-loss-form',
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
        La cuve {{ tank().code }} contient
        <span class="font-medium tabular-nums text-foreground"
          >{{ tank().volumeHl | number: '1.0-2' }} hl</span
        >.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label for="loss-volume" class="text-sm font-medium"
            >Volume perdu <span class="font-normal text-muted-foreground">(hl)</span></label
          >
          <input
            id="loss-volume"
            hlmInput
            type="number"
            step="0.01"
            [formField]="lossForm.volumeHl"
          />
          <app-field-error [state]="lossForm.volumeHl()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="loss-date" class="text-sm font-medium">Date</label>
          <input id="loss-date" hlmInput type="date" [formField]="lossForm.occurredOn" />
          <app-field-error [state]="lossForm.occurredOn()" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="loss-notes" class="text-sm font-medium"
          >Cause <span class="font-normal text-muted-foreground">(facultatif)</span></label
        >
        <input
          id="loss-notes"
          hlmInput
          placeholder="Évaporation, fuite de vanne, lies…"
          [formField]="lossForm.notes"
        />
        <app-field-error [state]="lossForm.notes()" />
      </div>

      @for (error of lossForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="lossForm().submitting()">
          {{ lossForm().submitting() ? 'Enregistrement…' : 'Enregistrer la perte' }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class LossForm {
  readonly tank = input.required<Tank>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly model = signal({
    volumeHl: null as number | null,
    occurredOn: todayLocal(),
    notes: '',
  });

  protected readonly lossForm = form(this.model, (path) => {
    required(path.volumeHl, { message: 'Indique le volume perdu' });
    validate(path.volumeHl, ({ value }) => {
      const volume = value();
      if (volume === null) {
        return undefined;
      }
      if (volume <= 0) {
        return { kind: 'positive', message: 'Le volume doit être positif' };
      }
      if (Math.round(volume * 100) !== volume * 100) {
        return { kind: 'decimals', message: '2 décimales au maximum' };
      }
      return volume > this.tank().volumeHl
        ? { kind: 'tooLarge', message: `La cuve ne contient que ${this.tank().volumeHl} hl` }
        : undefined;
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
    await submit(this.lossForm, {
      action: async () => {
        const value = this.model();
        try {
          await this.api.recordLoss(this.tank().id, {
            volumeHl: value.volumeHl!,
            occurredAt: toInstant(value.occurredOn),
            reference: null,
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.lossForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
