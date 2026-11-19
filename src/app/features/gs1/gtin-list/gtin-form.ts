import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  form,
  FormField,
  hidden,
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
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { StockOverviewRow } from '../../stock/stock.models';
import { Gs1Api } from '../gs1-api';
import {
  checkDigit,
  Gs1Prefix,
  Gtin,
  GtinPackaging,
  isValidGtin,
  normalizeGtin,
  PACKAGING_LABELS,
} from '../gs1.models';

interface GtinModel {
  prefixId: string;
  gtin: string;
  finishedArticleId: string;
  packaging: GtinPackaging;
  unitsPerPack: number | null;
  description: string;
  notes: string;
}

/**
 * Générer le gencode suivant d'un préfixe et l'attribuer à un produit fini (mode « generate »),
 * ou enregistrer un gencode qui existe déjà (mode « record » : la clé est vérifiée, le produit facultatif).
 */
@Component({
  selector: 'app-gtin-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  template: `
    <form (submit)="$event.preventDefault(); save()" novalidate class="flex flex-col gap-4">
      @if (mode() === 'record') {
        <div class="flex flex-col gap-1.5">
          <label for="gt-gtin" class="text-sm font-medium">Gencode</label>
          <input
            id="gt-gtin"
            hlmInput
            inputmode="numeric"
            class="font-mono text-base tracking-wider"
            placeholder="3 760123 456784"
            [formField]="gtinForm.gtin"
          />
          <app-field-error [state]="gtinForm.gtin()" />
        </div>
      } @else if (activePrefixes().length > 1) {
        <div class="flex flex-col gap-1.5">
          <label for="gt-prefix" class="text-sm font-medium">Préfixe GS1</label>
          <select id="gt-prefix" [formField]="gtinForm.prefixId" [class]="selectClass">
            @for (prefix of activePrefixes(); track prefix.id) {
              <option [value]="prefix.id">
                {{ prefix.prefix }}{{ prefix.label ? ' · ' + prefix.label : '' }} —
                {{ prefix.remaining }} restants
              </option>
            }
          </select>
        </div>
      }

      <div class="flex flex-col gap-1.5">
        <label for="gt-product" class="text-sm font-medium">
          Produit fini
          @if (mode() === 'record') {
            <span class="font-normal text-muted-foreground">(vide : réservé)</span>
          }
        </label>
        <select id="gt-product" [formField]="gtinForm.finishedArticleId" [class]="selectClass">
          <option value="">
            {{ mode() === 'record' ? "Aucun pour l'instant" : 'Choisir un produit…' }}
          </option>
          @for (product of products(); track product.articleId) {
            <option [value]="product.articleId">
              {{ product.articleLabel }} ({{ product.articleCode }})
            </option>
          }
        </select>
        <app-field-error [state]="gtinForm.finishedArticleId()" />
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Ce que désigne le gencode</span>
        <div class="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Conditionnement"
            class="flex w-fit gap-1 rounded-lg bg-muted p-1"
          >
            @for (packaging of packagings; track packaging) {
              <button
                type="button"
                (click)="setPackaging(packaging)"
                [attr.aria-pressed]="model().packaging === packaging"
                class="h-8 cursor-pointer rounded-md px-3 text-[13px] font-medium transition-colors"
                [class]="
                  model().packaging === packaging
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                "
              >
                {{ packagingLabels[packaging] }}
              </button>
            }
          </div>
          @if (!gtinForm.unitsPerPack().hidden()) {
            <div class="flex items-center gap-2">
              <label for="gt-units" class="text-sm">de</label>
              <input
                id="gt-units"
                hlmInput
                type="number"
                step="1"
                class="w-20"
                [formField]="gtinForm.unitsPerPack"
              />
              <span class="text-sm text-muted-foreground">bouteilles</span>
            </div>
          }
        </div>
        <app-field-error [state]="gtinForm.unitsPerPack()" />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="gt-description" class="text-sm font-medium"
          >Libellé <span class="font-normal text-muted-foreground">(facultatif)</span></label
        >
        <input
          id="gt-description"
          hlmInput
          [formField]="gtinForm.description"
          placeholder="Carton 6 bt couché, export Japon…"
        />
        <app-field-error [state]="gtinForm.description()" />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="gt-notes" class="text-sm font-medium"
          >Notes <span class="font-normal text-muted-foreground">(facultatif)</span></label
        >
        <textarea
          id="gt-notes"
          hlmInput
          rows="2"
          class="h-auto py-2"
          [formField]="gtinForm.notes"
        ></textarea>
      </div>

      @for (error of gtinForm().errors(); track error.kind) {
        <p role="alert" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error.message }}
        </p>
      }

      <hlm-dialog-footer>
        <button hlmBtn variant="outline" type="button" (click)="cancelled.emit()">Annuler</button>
        <button hlmBtn type="submit" [disabled]="gtinForm().submitting()">
          {{
            gtinForm().submitting()
              ? 'Enregistrement…'
              : mode() === 'generate'
                ? 'Générer le gencode'
                : 'Enregistrer'
          }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class GtinForm {
  readonly mode = input<'generate' | 'record'>('generate');
  readonly prefixes = input<Gs1Prefix[]>([]);
  /** Un produit déjà choisi (depuis un filtre de la liste). */
  readonly articleId = input<string | null>(null);
  readonly saved = output<Gtin>();
  readonly cancelled = output<void>();

  private readonly api = inject(Gs1Api);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly packagingLabels = PACKAGING_LABELS;
  protected readonly packagings: GtinPackaging[] = ['BOTTLE', 'CARTON', 'WOODEN_CASE', 'OTHER'];

  private readonly finishedGoods = httpResource<StockOverviewRow[]>(() => ({
    url: '/api/stock/overview',
    params: { finishedGoods: true },
  }));
  protected readonly products = computed(() =>
    (this.finishedGoods.hasValue() ? this.finishedGoods.value() : [])
      .filter((row) => row.active)
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );

  /** Les préfixes actifs qui ont encore de la place. */
  protected readonly activePrefixes = computed(() =>
    this.prefixes().filter((p) => p.active && p.remaining > 0),
  );

  /** Au départ : le premier préfixe qui a de la place, le produit déjà filtré dans la liste. */
  protected readonly model = linkedSignal<GtinModel>(() => ({
    prefixId: this.activePrefixes()[0]?.id ?? '',
    gtin: '',
    finishedArticleId: this.articleId() ?? '',
    packaging: 'BOTTLE',
    unitsPerPack: null,
    description: '',
    notes: '',
  }));

  protected readonly gtinForm = form(this.model, (path) => {
    required(path.finishedArticleId, {
      message: 'Choisis le produit fini',
      when: () => this.mode() === 'generate',
    });
    required(path.gtin, { message: 'Saisis le gencode', when: () => this.mode() === 'record' });
    validate(path.gtin, ({ value }) => {
      if (this.mode() !== 'record' || !value()) {
        return undefined;
      }
      const gtin = normalizeGtin(value());
      if (!/^\d{13}$/.test(gtin)) {
        return {
          kind: 'format',
          message: `13 chiffres attendus (${gtin.replace(/\D/g, '').length} saisis)`,
        };
      }
      return isValidGtin(gtin)
        ? undefined
        : {
            kind: 'checkDigit',
            message: `Clé de contrôle fausse : le dernier chiffre devrait être ${checkDigit(gtin.slice(0, 12))}`,
          };
    });
    hidden(path.unitsPerPack, { when: ({ valueOf }) => valueOf(path.packaging) === 'BOTTLE' });
    required(path.unitsPerPack, {
      message: 'Indique le nombre de bouteilles',
      when: ({ valueOf }) => valueOf(path.packaging) !== 'BOTTLE',
    });
    min(path.unitsPerPack, 2, { message: 'Un groupé compte au moins 2 bouteilles' });
    max(path.unitsPerPack, 1000, { message: '1000 au maximum' });
    maxLength(path.description, 200, { message: '200 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });
  });

  protected setPackaging(packaging: GtinPackaging): void {
    this.model.update((model) => ({
      ...model,
      packaging,
      // Le carton de 6 est le plus courant : proposé d'office
      unitsPerPack: packaging === 'BOTTLE' ? null : (model.unitsPerPack ?? 6),
    }));
  }

  protected async save(): Promise<void> {
    await submit(this.gtinForm, {
      action: async () => {
        const value = this.model();
        const common = {
          finishedArticleId: value.finishedArticleId || null,
          packaging: value.packaging,
          unitsPerPack: value.packaging === 'BOTTLE' ? null : value.unitsPerPack,
          description: value.description.trim() || null,
          notes: value.notes.trim() || null,
        };
        try {
          const saved =
            this.mode() === 'generate'
              ? await this.api.generate({
                  ...common,
                  finishedArticleId: value.finishedArticleId,
                  prefixId: value.prefixId || null,
                })
              : await this.api.record({ ...common, gtin: normalizeGtin(value.gtin) });
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return { fieldTree: this.gtinForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
