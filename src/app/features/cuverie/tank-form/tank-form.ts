import { Component, inject, input, linkedSignal, output } from '@angular/core';
import {
  form,
  FormField,
  hidden,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { CuverieApi } from '../cuverie-api';
import { Tank } from '../cuverie.models';

const toModel = (tank: Tank | null) => ({
  code: tank?.code ?? '',
  label: tank?.label ?? '',
  capacityHl: tank?.capacityHl ?? (null as number | null),
});

/** Création ou modification d'une cuve. Le code ne change plus une fois la cuve créée. */
@Component({
  selector: 'app-tank-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        @if (!tankForm.code().hidden()) {
          <div class="flex flex-col gap-1.5">
            <label for="tank-code" class="text-sm font-medium">Code</label>
            <input
              id="tank-code"
              hlmInput
              [formField]="tankForm.code"
              placeholder="C13"
              class="uppercase"
            />
            <app-field-error [state]="tankForm.code()" />
          </div>
        }
        <div class="flex flex-col gap-1.5" [class.sm:col-span-2]="tankForm.code().hidden()">
          <label for="tank-label" class="text-sm font-medium">
            Libellé <span class="font-normal text-muted-foreground">(facultatif)</span>
          </label>
          <input
            id="tank-label"
            hlmInput
            [formField]="tankForm.label"
            placeholder="Inox 200 · chai nord"
          />
          <app-field-error [state]="tankForm.label()" />
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="tank-capacity" class="text-sm font-medium"
          >Contenance <span class="font-normal text-muted-foreground">(hl)</span></label
        >
        <input
          id="tank-capacity"
          hlmInput
          type="number"
          step="0.01"
          class="sm:w-40"
          [formField]="tankForm.capacityHl"
        />
        @if (tank(); as current) {
          @if (current.volumeHl > 0) {
            <p class="text-xs text-muted-foreground">
              La cuve contient {{ current.volumeHl }} hl : la contenance ne peut pas être
              inférieure.
            </p>
          }
        }
        <app-field-error [state]="tankForm.capacityHl()" />
      </div>

      @for (error of tankForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="tankForm().submitting()">
          {{ tankForm().submitting() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class TankForm {
  /** null : création ; une cuve : modification. */
  readonly tank = input<Tank | null>(null);
  readonly saved = output<Tank>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly model = linkedSignal(() => toModel(this.tank()));

  protected readonly tankForm = form(this.model, (path) => {
    hidden(path.code, { when: () => this.tank() !== null });
    required(path.code, {
      message: 'Indique le code de la cuve',
      when: () => this.tank() === null,
    });
    maxLength(path.code, 30, { message: '30 caractères au maximum' });
    pattern(path.code, /^[A-Za-z0-9_-]*$/, { message: 'Lettres, chiffres, - et _ seulement' });
    maxLength(path.label, 100, { message: '100 caractères au maximum' });
    required(path.capacityHl, { message: 'Indique la contenance' });
    validate(path.capacityHl, ({ value }) => {
      const capacity = value();
      if (capacity === null) {
        return undefined;
      }
      if (capacity <= 0) {
        return { kind: 'positive', message: 'La contenance doit être positive' };
      }
      return Math.round(capacity * 100) !== capacity * 100
        ? { kind: 'decimals', message: '2 décimales au maximum (au litre près)' }
        : undefined;
    });
  });

  protected async save(): Promise<void> {
    await submit(this.tankForm, {
      action: async () => {
        const value = this.model();
        const current = this.tank();
        try {
          const tank = current
            ? await this.api.updateTank(current.id, {
                label: value.label.trim() || null,
                capacityHl: value.capacityHl!,
              })
            : await this.api.createTank({
                code: value.code.trim().toUpperCase(),
                label: value.label.trim() || null,
                capacityHl: value.capacityHl!,
              });
          this.saved.emit(tank);
          return undefined;
        } catch (error) {
          return { fieldTree: this.tankForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
