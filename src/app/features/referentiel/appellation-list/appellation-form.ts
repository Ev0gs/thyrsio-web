import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { ReferentielApi } from '../referentiel-api';
import { AppellationRow } from '../referentiel.models';

/**
 * Créer ou modifier une appellation. Son sigle entre dans les numéros de lot : Bordeaux, BX → LBX2401.
 * Changer un sigle ne touche pas les numéros déjà attribués ; seuls les suivants le prennent.
 */
@Component({
  selector: 'app-appellation-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      <div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div class="flex flex-col gap-1.5">
          <label for="ap-name" class="text-sm font-medium">Appellation</label>
          <input
            id="ap-name"
            hlmInput
            [formField]="appellationForm.name"
            placeholder="Côtes de Bourg"
          />
          <app-field-error [state]="appellationForm.name()" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="ap-code" class="text-sm font-medium">Sigle</label>
          <input
            id="ap-code"
            hlmInput
            [formField]="appellationForm.code"
            class="font-mono uppercase"
            placeholder="CDB"
          />
          <app-field-error [state]="appellationForm.code()" />
        </div>
      </div>
      <p class="rounded-md bg-muted px-3 py-2 text-sm">
        Numéro de lot d'un millésime 2024 :
        <span class="font-mono font-semibold">L{{ example() }}2401</span>, puis
        <span class="font-mono">L{{ example() }}2402</span>…
        @if (isEdit()) {
          <span class="block text-xs text-muted-foreground"
            >Les numéros déjà attribués ne changent pas.</span
          >
        }
      </p>

      @for (error of appellationForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="appellationForm().submitting()">
          {{
            appellationForm().submitting()
              ? 'Enregistrement…'
              : isEdit()
                ? 'Enregistrer'
                : 'Ajouter'
          }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class AppellationForm {
  /** null : nouvelle appellation. */
  readonly appellation = input<AppellationRow | null>(null);
  readonly saved = output<AppellationRow>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly isEdit = computed(() => this.appellation() !== null);
  protected readonly model = linkedSignal(() => ({
    name: this.appellation()?.name ?? '',
    code: this.appellation()?.code ?? '',
  }));
  protected readonly example = computed(() => this.model().code.trim().toUpperCase() || 'BX');

  protected readonly appellationForm = form(this.model, (path) => {
    required(path.name, { message: "Indique l'appellation" });
    maxLength(path.name, 100, { message: '100 caractères au maximum' });
    required(path.code, { message: 'Indique son sigle' });
    pattern(path.code, /^\s*[A-Za-z]{1,4}\s*$/, {
      message: '1 à 4 lettres, sans chiffre : le millésime suit dans le numéro de lot',
    });
  });

  protected async save(): Promise<void> {
    await submit(this.appellationForm, {
      action: async () => {
        const value = this.model();
        const request = { name: value.name.trim(), code: value.code.trim().toUpperCase() };
        try {
          const current = this.appellation();
          const saved = current
            ? await this.api.updateAppellation(current.id, request)
            : await this.api.createAppellation(request);
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return {
            fieldTree: this.appellationForm,
            kind: 'server',
            message: problemMessage(error),
          };
        }
      },
    });
  }
}
