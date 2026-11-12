import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  applyEach,
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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { describeWine, Tank } from '../../cuverie/cuverie.models';
import { StockOverviewRow } from '../../stock/stock.models';
import { ProductionApi } from '../production-api';
import {
  Bottling,
  BOTTLING_LOCATION_LABELS,
  BottlingLocation,
  BottlingRow,
  wineNeededHl,
} from '../production.models';

interface MaterialModel {
  articleId: string;
  plannedQuantity: number | null;
}

interface BottlingModel {
  finishedArticleId: string;
  location: BottlingLocation;
  sourceTankId: string;
  wineDescription: string;
  contractor: string;
  startDate: string;
  endDate: string;
  plannedBottles: number | null;
  bottleVolumeCl: number | null;
  notes: string;
  materials: MaterialModel[];
}

const toModel = (bottling: Bottling | null, day: string | null): BottlingModel => ({
  finishedArticleId: bottling?.finishedArticleId ?? '',
  location: bottling?.location ?? 'ON_SITE',
  sourceTankId: bottling?.sourceTankId ?? '',
  wineDescription: bottling?.wineDescription ?? '',
  contractor: bottling?.contractor ?? '',
  startDate: bottling?.startDate ?? day ?? todayLocal(),
  endDate: bottling?.endDate ?? day ?? todayLocal(),
  plannedBottles: bottling?.plannedBottles ?? null,
  bottleVolumeCl: bottling?.bottleVolumeCl ?? 75,
  notes: bottling?.notes ?? '',
  materials:
    bottling?.materials.map((m) => ({
      articleId: m.articleId,
      plannedQuantity: m.plannedQuantity,
    })) ?? [],
});

/** Une quantité proportionnelle au nombre de bouteilles : arrondie au supérieur pour les unités entières. */
const scale = (quantity: number, ratio: number, unitCode: string | undefined) => {
  const scaled = quantity * ratio;
  return unitCode === 'U' ? Math.ceil(scaled - 1e-9) : Math.round(scaled * 10000) / 10000;
};

/**
 * Planifier ou modifier une mise. Chaque mise a sa propre liste de matières :
 * on la saisit, ou on la reprend d'une mise précédente (quantités recalculées au nombre de bouteilles).
 */
@Component({
  selector: 'app-bottling-form',
  imports: [
    DecimalPipe,
    RouterLink,
    NgIcon,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2 })],
  templateUrl: './bottling-form.html',
})
export class BottlingForm {
  /** null : nouvelle mise ; une mise : modification. */
  readonly bottling = input<Bottling | null>(null);
  /** Le jour cliqué dans le planning, pour une nouvelle mise. */
  readonly day = input<string | null>(null);
  readonly saved = output<Bottling>();
  readonly cancelled = output<void>();

  private readonly api = inject(ProductionApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly locationLabels = BOTTLING_LOCATION_LABELS;
  protected readonly locations: BottlingLocation[] = ['ON_SITE', 'AT_PRODUCER'];
  protected readonly describeWine = describeWine;

  // ---------- Les listes de choix ----------

  private readonly finishedGoods = httpResource<StockOverviewRow[]>(() => ({
    url: '/api/stock/overview',
    params: { finishedGoods: true },
  }));
  private readonly dryGoods = httpResource<StockOverviewRow[]>(() => '/api/stock/overview');
  private readonly tanks = httpResource<Tank[]>(() => '/api/cuverie/tanks');
  /** Les mises récentes, pour en reprendre la liste de matières. */
  private readonly previous = httpResource<Page<BottlingRow>>(() => ({
    url: '/api/production/bottlings',
    params: { size: 50, sort: 'startDate,desc' },
  }));

  protected readonly productOptions = computed(() =>
    (this.finishedGoods.hasValue() ? this.finishedGoods.value() : [])
      .filter((row) => row.active || row.articleId === this.bottling()?.finishedArticleId)
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );
  protected readonly finishedGoodsLoaded = computed(() => this.finishedGoods.hasValue());

  protected readonly articleOptions = computed(() =>
    (this.dryGoods.hasValue() ? this.dryGoods.value() : [])
      .filter((row) => row.active)
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );
  private readonly articlesById = computed(
    () =>
      new Map(
        (this.dryGoods.hasValue() ? this.dryGoods.value() : []).map((row) => [row.articleId, row]),
      ),
  );

  /** Les cuves qui contiennent du vin (et celle de la mise, même vidée depuis). */
  protected readonly tankOptions = computed(() =>
    (this.tanks.hasValue() ? this.tanks.value() : []).filter(
      (tank) => tank.volumeHl > 0 || tank.id === this.bottling()?.sourceTankId,
    ),
  );

  protected readonly previousOptions = computed(() =>
    (this.previous.hasValue() ? this.previous.value().content : []).filter(
      (row) => row.id !== this.bottling()?.id && row.status !== 'CANCELLED',
    ),
  );

  // ---------- Le modèle et ses règles ----------

  protected readonly model = linkedSignal(() => toModel(this.bottling(), this.day()));
  /** Le nombre de bouteilles pour lequel la liste de matières a été établie : sert à la recalculer. */
  protected readonly materialsBasis = linkedSignal(() => this.bottling()?.plannedBottles ?? null);
  protected readonly copyError = signal<string | null>(null);

  protected readonly bottlingForm = form(this.model, (path) => {
    required(path.finishedArticleId, { message: 'Choisis le produit fini' });
    required(path.startDate, { message: 'Indique le premier jour' });
    required(path.endDate, { message: 'Indique le dernier jour' });
    validate(path.endDate, ({ value, valueOf }) =>
      value() && value() < valueOf(path.startDate)
        ? { kind: 'beforeStart', message: 'Le dernier jour est avant le premier' }
        : undefined,
    );
    required(path.plannedBottles, { message: 'Indique le nombre de bouteilles' });
    min(path.plannedBottles, 1, { message: 'Au moins une bouteille' });
    validate(path.plannedBottles, ({ value }) =>
      value() !== null && !Number.isInteger(value())
        ? { kind: 'integer', message: 'Un nombre entier de bouteilles' }
        : undefined,
    );
    required(path.bottleVolumeCl, { message: 'Indique la contenance' });
    min(path.bottleVolumeCl, 1, { message: 'Contenance invalide' });
    max(path.bottleVolumeCl, 10000, { message: 'Contenance invalide' });

    hidden(path.sourceTankId, { when: ({ valueOf }) => valueOf(path.location) !== 'ON_SITE' });
    required(path.sourceTankId, {
      message: 'Choisis la cuve dont le vin sera tiré',
      when: ({ valueOf }) => valueOf(path.location) === 'ON_SITE',
    });
    hidden(path.wineDescription, {
      when: ({ valueOf }) => valueOf(path.location) !== 'AT_PRODUCER',
    });
    maxLength(path.wineDescription, 200, { message: '200 caractères au maximum' });
    maxLength(path.contractor, 200, { message: '200 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });

    applyEach(path.materials, (material) => {
      required(material.articleId, { message: 'Choisis un article' });
      required(material.plannedQuantity, { message: 'Indique la quantité' });
      min(material.plannedQuantity, 0.0001, { message: 'La quantité doit être positive' });
      validate(material.articleId, ({ value, valueOf }) => {
        const articleId = value();
        const count = valueOf(path.materials).filter(
          (other) => other.articleId === articleId,
        ).length;
        return articleId && count > 1
          ? { kind: 'duplicate', message: 'Déjà dans la liste' }
          : undefined;
      });
    });
  });

  // ---------- Ce qu'on affiche à côté des champs ----------

  protected readonly selectedTank = computed(() =>
    this.tankOptions().find((tank) => tank.id === this.model().sourceTankId),
  );

  protected readonly wineNeeded = computed(() => {
    const value = this.model();
    return value.plannedBottles && value.bottleVolumeCl
      ? wineNeededHl(value.plannedBottles, value.bottleVolumeCl)
      : 0;
  });

  protected readonly canRescale = computed(() => {
    const basis = this.materialsBasis();
    const bottles = this.model().plannedBottles;
    return !!basis && !!bottles && basis !== bottles && this.model().materials.length > 0;
  });

  protected article(articleId: string): StockOverviewRow | undefined {
    return this.articlesById().get(articleId);
  }

  // ---------- Les matières ----------

  protected addMaterial(): void {
    this.model.update((model) => ({
      ...model,
      materials: [...model.materials, { articleId: '', plannedQuantity: model.plannedBottles }],
    }));
    if (!this.materialsBasis()) {
      this.materialsBasis.set(this.model().plannedBottles);
    }
  }

  protected removeMaterial(index: number): void {
    this.model.update((model) => ({
      ...model,
      materials: model.materials.filter((_, i) => i !== index),
    }));
  }

  /** Reprend la liste d'une mise précédente, à l'échelle du nombre de bouteilles de celle-ci. */
  protected async copyFrom(bottlingId: string): Promise<void> {
    if (!bottlingId) {
      return;
    }
    this.copyError.set(null);
    try {
      const source = await this.api.getBottling(bottlingId);
      const bottles = this.model().plannedBottles ?? source.plannedBottles;
      const ratio = bottles / source.plannedBottles;
      this.model.update((model) => ({
        ...model,
        plannedBottles: bottles,
        materials: source.materials.map((line) => ({
          articleId: line.articleId,
          plannedQuantity: scale(line.plannedQuantity, ratio, line.unitCode),
        })),
      }));
      this.materialsBasis.set(bottles);
    } catch (error) {
      this.copyError.set(problemMessage(error));
    }
  }

  /** Le nombre de bouteilles a changé : toutes les quantités suivent, dans la même proportion. */
  protected rescale(): void {
    const basis = this.materialsBasis();
    const bottles = this.model().plannedBottles;
    if (!basis || !bottles) {
      return;
    }
    const ratio = bottles / basis;
    this.model.update((model) => ({
      ...model,
      materials: model.materials.map((line) => ({
        ...line,
        plannedQuantity:
          line.plannedQuantity === null
            ? null
            : scale(line.plannedQuantity, ratio, this.article(line.articleId)?.unitCode),
      })),
    }));
    this.materialsBasis.set(bottles);
  }

  // ---------- Enregistrement ----------

  protected async save(): Promise<void> {
    await submit(this.bottlingForm, {
      action: async () => {
        const value = this.model();
        const request = {
          location: value.location,
          contractor: value.contractor.trim() || null,
          startDate: value.startDate,
          endDate: value.endDate,
          finishedArticleId: value.finishedArticleId,
          plannedBottles: value.plannedBottles!,
          bottleVolumeCl: value.bottleVolumeCl!,
          sourceTankId: value.location === 'ON_SITE' ? value.sourceTankId : null,
          wineDescription:
            value.location === 'AT_PRODUCER' ? value.wineDescription.trim() || null : null,
          notes: value.notes.trim() || null,
          materials: value.materials.map((line) => ({
            articleId: line.articleId,
            plannedQuantity: line.plannedQuantity!,
          })),
        };
        try {
          const current = this.bottling();
          const saved = current
            ? await this.api.updateBottling(current.id, request)
            : await this.api.createBottling(request);
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return { fieldTree: this.bottlingForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
