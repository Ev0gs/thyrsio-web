import { Component, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, maxLength, pattern, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { Gs1Api } from '../gs1-api';
import { Gs1Prefix } from '../gs1.models';

/**
 * Les préfixes entreprise GS1 : leur remplissage, et l'ajout d'un nouveau quand un préfixe est plein.
 * Un préfixe ne se modifie pas (ses gencodes en dépendent) ; on peut le désactiver.
 */
@Component({
  selector: 'app-prefix-manager',
  imports: [DecimalPipe, FormField, FieldError, HlmButtonImports, HlmInputImports],
  template: `
    <div class="flex flex-col gap-4">
      @for (prefix of prefixes(); track prefix.id) {
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
          [class.opacity-60]="!prefix.active"
        >
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="font-mono text-sm font-semibold"
              >{{ prefix.prefix }}
              <span class="font-sans font-normal text-muted-foreground">{{
                prefix.label ? '· ' + prefix.label : ''
              }}</span>
            </span>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full"
                [class]="prefix.remaining < prefix.capacity * 0.1 ? 'bg-red-500' : 'bg-primary'"
                [style.width.%]="(prefix.used / prefix.capacity) * 100"
              ></div>
            </div>
            <span class="text-xs text-muted-foreground">
              {{ prefix.used | number }} pris · {{ prefix.remaining | number }} restants sur
              {{ prefix.capacity | number }}
              {{ prefix.active ? '' : '· désactivé' }}
            </span>
          </div>
          <button
            hlmBtn
            variant="ghost"
            size="sm"
            type="button"
            [disabled]="busy()"
            (click)="toggle(prefix)"
          >
            {{ prefix.active ? 'Désactiver' : 'Réactiver' }}
          </button>
        </div>
      }

      <form
        (submit)="$event.preventDefault(); add()"
        novalidate
        class="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3"
      >
        <span class="text-sm font-medium">{{
          prefixes().length ? 'Ajouter un préfixe' : 'Le préfixe entreprise GS1'
        }}</span>
        <div class="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-start">
          <div class="flex flex-col gap-1">
            <label for="px-prefix" class="sr-only">Préfixe</label>
            <input
              id="px-prefix"
              hlmInput
              inputmode="numeric"
              class="font-mono"
              placeholder="376012345"
              [formField]="prefixForm.prefix"
            />
            <app-field-error [state]="prefixForm.prefix()" />
          </div>
          <div class="flex flex-col gap-1">
            <label for="px-label" class="sr-only">Libellé</label>
            <input
              id="px-label"
              hlmInput
              placeholder="Libellé (facultatif)"
              [formField]="prefixForm.label"
            />
          </div>
          <button hlmBtn variant="outline" type="submit" [disabled]="prefixForm().submitting()">
            Ajouter
          </button>
        </div>
        <p class="text-xs text-muted-foreground">
          Tel qu'il figure sur le certificat GS1 : 9 chiffres donnent 1 000 gencodes, 10 chiffres
          100.
        </p>
        @for (error of prefixForm().errors(); track error.kind) {
          <p role="alert" class="text-sm text-destructive">{{ error.message }}</p>
        }
      </form>
      @if (error(); as message) {
        <p role="alert" class="text-sm text-destructive">{{ message }}</p>
      }
    </div>
  `,
})
export class PrefixManager {
  readonly prefixes = input.required<Gs1Prefix[]>();
  readonly changed = output<void>();

  private readonly api = inject(Gs1Api);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly model = signal({ prefix: '', label: '' });
  protected readonly prefixForm = form(this.model, (path) => {
    required(path.prefix, { message: 'Indique le préfixe' });
    pattern(path.prefix, /^\s*\d{6,11}\s*$/, { message: 'De 6 à 11 chiffres' });
    maxLength(path.label, 100, { message: '100 caractères au maximum' });
  });

  protected async add(): Promise<void> {
    await submit(this.prefixForm, {
      action: async () => {
        try {
          const value = this.model();
          await this.api.createPrefix(value.prefix.trim(), value.label.trim() || null);
          this.model.set({ prefix: '', label: '' });
          this.prefixForm().reset();
          this.changed.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.prefixForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }

  protected async toggle(prefix: Gs1Prefix): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.updatePrefix(prefix, prefix.label, !prefix.active);
      this.changed.emit();
    } catch (error) {
      this.error.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
