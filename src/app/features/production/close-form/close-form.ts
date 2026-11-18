import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { ProductionApi } from '../production-api';
import { Bottling, MaterialLine } from '../production.models';

/** Une matière sèche consommée : un article et sa quantité (les matières sèches n'ont pas de lot). */
interface LineModel {
  articleId: string;
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
  viewProviders: [provideIcons({ lucideTrash2 })],
  templateUrl: './close-form.html',
})
export class CloseForm {
  readonly bottling = input.required<Bottling>();
  readonly saved = output<Bottling>();
  readonly cancelled = output<void>();

  private readonly api = inject(ProductionApi);

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
      // Le stock de la matière, connu tant que la mise est planifiée : l'API refuserait de toute façon
      validate(line.quantity, ({ value, valueOf }) => {
        const quantity = value();
        const material = this.material(valueOf(line.articleId));
        const stock = material?.stockQuantity ?? null;
        return quantity !== null && stock !== null && quantity > stock
          ? {
              kind: 'stock',
              message: `Il n'y en a que ${stock} ${material!.unitCode} en stock`,
            }
          : undefined;
      });
    });
  });

  protected material(articleId: string): MaterialLine | undefined {
    return this.materialsById().get(articleId);
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
              quantity: line.quantity!,
            })),
          });
          this.saved.emit(closed);
          return undefined;
        } catch (error) {
          // "Stock insuffisant pour BCH-LIE-4924…" : rien n'a été enregistré
          return { fieldTree: this.closeForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
