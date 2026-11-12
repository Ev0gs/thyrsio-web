import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  applyEach,
  form,
  FormField,
  hidden,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { BalanceRow } from '../../stock/stock.models';
import { ProductionApi } from '../production-api';
import { Bottling, MaterialLine } from '../production.models';

interface LineModel {
  articleId: string;
  lotId: string;
  quantity: number | null;
}

interface CloseModel {
  producedBottles: number | null;
  brokenBottles: number | null;
  wineUsedHl: number | null;
  lines: LineModel[];
}

const toModel = (bottling: Bottling): CloseModel => ({
  producedBottles: bottling.plannedBottles,
  brokenBottles: 0,
  wineUsedHl: bottling.location === 'ON_SITE' ? bottling.wineNeededHl : null,
  lines: bottling.materials.map((m) => ({
    articleId: m.articleId,
    lotId: '',
    quantity: m.plannedQuantity,
  })),
});

/**
 * La clôture : on saisit le réel (ce qui était noté sur papier). L'enregistrement consomme les matières,
 * tire le vin de la cuve et fait entrer les bouteilles en stock, en une fois.
 */
@Component({
  selector: 'app-close-form',
  imports: [
    DecimalPipe,
    NgIcon,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2 })],
  templateUrl: './close-form.html',
})
export class CloseForm {
  readonly bottling = input.required<Bottling>();
  readonly saved = output<Bottling>();
  readonly cancelled = output<void>();

  private readonly api = inject(ProductionApi);

  protected readonly selectClass = SELECT_CLASS;

  /** Tous les soldes non nuls, en une requête : de quoi proposer les lots de chaque matière. */
  private readonly balances = httpResource<Page<BalanceRow>>(() => ({
    url: '/api/stock/balances',
    params: { size: 1000 },
  }));

  private readonly lotsByArticle = computed(() => {
    const map = new Map<string, BalanceRow[]>();
    for (const balance of this.balances.hasValue() ? this.balances.value().content : []) {
      if (balance.lotId) {
        map.set(balance.articleId, [...(map.get(balance.articleId) ?? []), balance]);
      }
    }
    return map;
  });

  private readonly materialsById = computed(
    () => new Map(this.bottling().materials.map((material) => [material.articleId, material])),
  );

  protected readonly model = linkedSignal(() => toModel(this.bottling()));

  protected readonly closeForm = form(this.model, (path) => {
    required(path.producedBottles, { message: 'Indique les bouteilles produites' });
    min(path.producedBottles, 1, { message: 'Au moins une bouteille' });
    validate(path.producedBottles, ({ value }) =>
      value() !== null && !Number.isInteger(value())
        ? { kind: 'integer', message: 'Un nombre entier' }
        : undefined,
    );
    min(path.brokenBottles, 0, { message: 'La casse ne peut pas être négative' });

    hidden(path.wineUsedHl, { when: () => this.bottling().location !== 'ON_SITE' });
    required(path.wineUsedHl, {
      message: 'Indique le vin tiré de la cuve',
      when: () => this.bottling().location === 'ON_SITE',
    });
    validate(path.wineUsedHl, ({ value }) => {
      const wine = value();
      const inTank = this.bottling().tankVolumeHl;
      if (wine === null || this.bottling().location !== 'ON_SITE') {
        return undefined;
      }
      if (wine <= 0) {
        return { kind: 'positive', message: 'Le volume doit être positif' };
      }
      return inTank !== null && wine > inTank
        ? {
            kind: 'tank',
            message: `La cuve ${this.bottling().sourceTankCode} ne contient que ${inTank} hl`,
          }
        : undefined;
    });

    applyEach(path.lines, (line) => {
      required(line.quantity, { message: 'Indique la quantité' });
      min(line.quantity, 0.0001, { message: 'La quantité doit être positive' });
      required(line.lotId, {
        message: 'Choisis le lot',
        when: ({ valueOf }) => this.material(valueOf(line.articleId))?.lotTracked ?? false,
      });
      validate(line.quantity, ({ value, valueOf }) => {
        const quantity = value();
        const lotId = valueOf(line.lotId);
        if (quantity === null || !lotId) {
          return undefined;
        }
        const lot = this.lotsFor(valueOf(line.articleId)).find(
          (balance) => balance.lotId === lotId,
        );
        return lot && quantity > lot.quantity
          ? { kind: 'stock', message: `Le lot ${lot.lotNumber} n'en contient que ${lot.quantity}` }
          : undefined;
      });
    });
  });

  constructor() {
    // Une fois les soldes reçus : une matière qui n'a qu'un seul lot en stock le reçoit d'office
    effect(() => {
      const lots = this.lotsByArticle();
      if (lots.size === 0) {
        return;
      }
      untracked(() =>
        this.model.update((model) => ({
          ...model,
          lines: model.lines.map((line) => {
            const available = lots.get(line.articleId) ?? [];
            return !line.lotId && available.length === 1
              ? { ...line, lotId: available[0].lotId! }
              : line;
          }),
        })),
      );
    });
  }

  protected material(articleId: string): MaterialLine | undefined {
    return this.materialsById().get(articleId);
  }

  protected lotsFor(articleId: string): BalanceRow[] {
    return this.lotsByArticle().get(articleId) ?? [];
  }

  /** Une matière prise dans deux lots : une ligne de plus pour le même article. */
  protected addLot(index: number): void {
    this.model.update((model) => {
      const lines = [...model.lines];
      lines.splice(index + 1, 0, { articleId: lines[index].articleId, lotId: '', quantity: null });
      return { ...model, lines };
    });
  }

  protected removeLine(index: number): void {
    this.model.update((model) => ({ ...model, lines: model.lines.filter((_, i) => i !== index) }));
  }

  protected async save(): Promise<void> {
    await submit(this.closeForm, {
      action: async () => {
        const value = this.model();
        try {
          const closed = await this.api.closeBottling(this.bottling().id, {
            producedBottles: value.producedBottles!,
            brokenBottles: value.brokenBottles,
            wineUsedHl: this.bottling().location === 'ON_SITE' ? value.wineUsedHl : null,
            consumptions: value.lines.map((line) => ({
              articleId: line.articleId,
              lotId: line.lotId || null,
              quantity: line.quantity!,
            })),
          });
          this.saved.emit(closed);
          return undefined;
        } catch (error) {
          // "Stock insuffisant pour BCH-LIE-4924 (lot 24-117)…" : rien n'a été enregistré
          return { fieldTree: this.closeForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
