import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
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
import { lucideCopy, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal } from '../../../core/dates';
import { FEATURES } from '../../../core/features';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { describeWine, Tank } from '../../cuverie/cuverie.models';
import { LineToPlan } from '../../sales/sales.models';
import { StockOverviewRow } from '../../stock/stock.models';
import { ProductionApi } from '../production-api';
import {
  addDays,
  AllocationRequest,
  Appellation,
  Bottling,
  BOTTLING_LOCATION_LABELS,
  BottlingLocation,
  BottlingRequest,
  lotPrefix,
  matchAppellation,
  Production,
  PRODUCTION_SLOT_LABELS,
  ProductionSlot,
  wineNeededHl,
} from '../production.models';

interface MaterialModel {
  articleId: string;
  plannedQuantity: number | null;
}

interface AllocationModel {
  orderLineId: string;
  quantity: number | null;
}

/** Une production du formulaire. Les productions clôturées ou annulées n'y figurent pas : elles sont figées. */
interface ProductionModel {
  id: string | null;
  /** Le numéro déjà attribué, et ce qui l'a composé : s'ils changent, l'API en donne un nouveau. */
  lotNumber: string | null;
  lotAppellationId: string | null;
  lotVintage: number | null;
  startDate: string;
  multiDay: boolean;
  endDate: string;
  slot: ProductionSlot;
  finishedArticleId: string;
  plannedBottles: number | null;
  bottleVolumeCl: number | null;
  sourceTankId: string;
  wineDescription: string;
  appellationId: string;
  vintage: number | null;
  materials: MaterialModel[];
  /** Le nombre de bouteilles pour lequel la liste de matières a été établie : sert à la recalculer. */
  materialsBasis: number | null;
  allocations: AllocationModel[];
}

interface BottlingModel {
  location: BottlingLocation;
  contractor: string;
  notes: string;
  productions: ProductionModel[];
}

/** Une mise planifiée depuis une commande : le produit, les bouteilles et la réservation déjà remplis. */
export interface BottlingPrefill {
  finishedArticleId: string;
  plannedBottles: number;
  allocations: AllocationRequest[];
}

/** Ce qu'on affiche d'une ligne de commande réservée : « CC-26-004 · Hudson Fine Wines ». */
interface AllocationOption {
  orderLineId: string;
  orderId: string;
  label: string;
  articleId: string;
  /** Ce qui manque encore à la ligne (pour une réservation existante : inconnu). */
  missing: number | null;
}

/** Une liste de matières qu'on peut reprendre : celle d'une production d'une mise récente. */
interface PreviousMaterials {
  key: string;
  label: string;
  plannedBottles: number;
  materials: { articleId: string; plannedQuantity: number; unitCode: string }[];
}

const emptyProduction = (day: string): ProductionModel => ({
  id: null,
  lotNumber: null,
  lotAppellationId: null,
  lotVintage: null,
  startDate: day,
  multiDay: false,
  endDate: day,
  slot: 'FULL_DAY',
  finishedArticleId: '',
  plannedBottles: null,
  bottleVolumeCl: 75,
  sourceTankId: '',
  wineDescription: '',
  appellationId: '',
  vintage: null,
  materials: [],
  materialsBasis: null,
  allocations: [],
});

const fromProduction = (p: Production): ProductionModel => ({
  id: p.id,
  lotNumber: p.lotNumber,
  lotAppellationId: p.lotNumber ? p.appellationId : null,
  lotVintage: p.lotNumber ? p.vintage : null,
  startDate: p.startDate,
  multiDay: p.endDate !== p.startDate,
  endDate: p.endDate,
  slot: p.slot,
  finishedArticleId: p.finishedArticleId,
  plannedBottles: p.plannedBottles,
  bottleVolumeCl: p.bottleVolumeCl,
  sourceTankId: p.sourceTankId ?? '',
  wineDescription: p.wineDescription ?? '',
  appellationId: p.appellationId ?? '',
  vintage: p.vintage,
  materials: p.materials.map((m) => ({
    articleId: m.articleId,
    plannedQuantity: m.plannedQuantity,
  })),
  materialsBasis: p.materials.length > 0 ? p.plannedBottles : null,
  allocations: p.allocations.map((a) => ({ orderLineId: a.orderLineId, quantity: a.quantity })),
});

const toModel = (
  bottling: Bottling | null,
  day: string | null,
  prefill: BottlingPrefill | null,
): BottlingModel => {
  if (bottling) {
    return {
      location: bottling.location,
      contractor: bottling.contractor ?? '',
      notes: bottling.notes ?? '',
      productions: bottling.productions.filter((p) => p.status === 'PLANNED').map(fromProduction),
    };
  }
  const first = emptyProduction(day ?? todayLocal());
  if (prefill) {
    first.finishedArticleId = prefill.finishedArticleId;
    first.plannedBottles = prefill.plannedBottles;
    first.allocations = prefill.allocations.map((a) => ({ ...a }));
  }
  return { location: 'ON_SITE', contractor: '', notes: '', productions: [first] };
};

/** Une quantité proportionnelle au nombre de bouteilles : arrondie au supérieur pour les unités entières. */
const scale = (quantity: number, ratio: number, unitCode: string | undefined) => {
  const scaled = quantity * ratio;
  return unitCode === 'U' ? Math.ceil(scaled - 1e-9) : Math.round(scaled * 10000) / 10000;
};

/**
 * Planifier ou modifier une mise : son lieu, puis ses productions (un produit le matin, un autre
 * l'après-midi, un troisième le lendemain...). Chaque production a sa liste de matières, et son numéro
 * de lot, attribué par l'API à l'enregistrement.
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
  viewProviders: [provideIcons({ lucideCopy, lucidePlus, lucideTrash2 })],
  templateUrl: './bottling-form.html',
})
export class BottlingForm {
  /** null : nouvelle mise ; une mise : modification. */
  readonly bottling = input<Bottling | null>(null);
  /** Le jour cliqué dans le planning, pour une nouvelle mise. */
  readonly day = input<string | null>(null);
  /** Une nouvelle mise pour une commande (bouton « Planifier »). */
  readonly prefill = input<BottlingPrefill | null>(null);

  /** Les commandes servies : seulement si les ventes sont affichées (les réservations existantes sont conservées). */
  protected readonly sales = FEATURES.sales;
  readonly saved = output<Bottling>();
  readonly cancelled = output<void>();

  private readonly api = inject(ProductionApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly locationLabels = BOTTLING_LOCATION_LABELS;
  protected readonly locations: BottlingLocation[] = ['ON_SITE', 'AT_PRODUCER'];
  protected readonly slotLabels = PRODUCTION_SLOT_LABELS;
  protected readonly describeWine = describeWine;

  // ---------- Les listes de choix ----------

  private readonly finishedGoods = httpResource<StockOverviewRow[]>(() => ({
    url: '/api/stock/overview',
    params: { finishedGoods: true },
  }));
  private readonly dryGoods = httpResource<StockOverviewRow[]>(() => '/api/stock/overview');
  private readonly tanks = httpResource<Tank[]>(() => '/api/cuverie/tanks');
  private readonly appellations = httpResource<Appellation[]>(() => ({
    url: '/api/referentiel/appellations',
    params: { includeArchived: true },
  }));
  /** Les mises récentes, pour reprendre la liste de matières d'une de leurs productions. */
  private readonly previous = httpResource<Page<Bottling>>(() => ({
    url: '/api/production/bottlings',
    params: { size: 30, sort: 'startDate,desc' },
  }));

  /** Les lignes de commande que ni le stock ni les mises ne couvrent : ce qu'une production peut servir. */
  private readonly linesToPlan = httpResource<LineToPlan[]>(() =>
    this.sales ? '/api/sales/order-lines/to-plan' : undefined,
  );

  /** Les productions déjà clôturées ou annulées : affichées, mais plus modifiables. */
  protected readonly frozen = computed(() =>
    (this.bottling()?.productions ?? []).filter((p) => p.status !== 'PLANNED'),
  );

  protected readonly productOptions = computed(() =>
    (this.finishedGoods.hasValue() ? this.finishedGoods.value() : [])
      .filter(
        (row) =>
          row.active ||
          this.bottling()?.productions.some((p) => p.finishedArticleId === row.articleId),
      )
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

  /** Les cuves qui contiennent du vin (et celles de la mise, même vidées depuis). */
  protected readonly tankOptions = computed(() =>
    (this.tanks.hasValue() ? this.tanks.value() : []).filter(
      (tank) =>
        tank.volumeHl > 0 || this.bottling()?.productions.some((p) => p.sourceTankId === tank.id),
    ),
  );

  private readonly allAppellations = computed(() =>
    this.appellations.hasValue() ? this.appellations.value() : [],
  );
  /** Les appellations actives, et celles déjà choisies (même archivées depuis). */
  protected readonly appellationOptions = computed(() =>
    this.allAppellations().filter(
      (a) => a.active || this.bottling()?.productions.some((p) => p.appellationId === a.id),
    ),
  );
  protected readonly appellationsLoaded = computed(() => this.appellations.hasValue());

  protected readonly previousOptions = computed<PreviousMaterials[]>(() =>
    (this.previous.hasValue() ? this.previous.value().content : [])
      .filter((b) => b.id !== this.bottling()?.id && b.status !== 'CANCELLED')
      .flatMap((b) =>
        b.productions
          .filter((p) => p.status !== 'CANCELLED' && p.materials.length > 0)
          .map((p) => ({
            key: p.id,
            label: `${b.code} · ${p.finishedArticleLabel} (${p.plannedBottles} bt)`,
            plannedBottles: p.plannedBottles,
            materials: p.materials.map((m) => ({
              articleId: m.articleId,
              plannedQuantity: m.plannedQuantity,
              unitCode: m.unitCode,
            })),
          })),
      ),
  );

  /** Les lignes réservables : celles déjà réservées par la mise, et celles à planifier. */
  private readonly allocationOptions = computed(() => {
    const options = new Map<string, AllocationOption>();
    for (const production of this.bottling()?.productions ?? []) {
      for (const a of production.allocations) {
        options.set(a.orderLineId, {
          orderLineId: a.orderLineId,
          orderId: a.orderId,
          label: `${a.orderCode} · ${a.clientName ?? ''}`,
          articleId: production.finishedArticleId,
          missing: null,
        });
      }
    }
    for (const line of this.linesToPlan.hasValue() ? this.linesToPlan.value() : []) {
      options.set(line.lineId, {
        orderLineId: line.lineId,
        orderId: line.orderId,
        label: `${line.orderCode} · ${line.clientName ?? ''}`,
        articleId: line.articleId,
        missing: line.missing,
      });
    }
    return options;
  });

  // ---------- Le modèle et ses règles ----------

  protected readonly model = linkedSignal(() =>
    toModel(this.bottling(), this.day(), this.prefill()),
  );

  protected readonly bottlingForm = form(this.model, (path) => {
    maxLength(path.contractor, 200, { message: '200 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });
    validate(path.productions, ({ value }) =>
      value().length === 0 && this.frozen().length === 0
        ? { kind: 'empty', message: 'Ajoute au moins une production' }
        : undefined,
    );

    applyEach(path.productions, (p) => {
      required(p.startDate, { message: 'Indique le jour' });
      hidden(p.endDate, { when: ({ valueOf }) => !valueOf(p.multiDay) });
      required(p.endDate, {
        message: 'Indique le dernier jour',
        when: ({ valueOf }) => valueOf(p.multiDay),
      });
      validate(p.endDate, ({ value, valueOf }) =>
        valueOf(p.multiDay) && value() && value() <= valueOf(p.startDate)
          ? { kind: 'beforeStart', message: 'Le dernier jour doit suivre le premier' }
          : undefined,
      );
      hidden(p.slot, { when: ({ valueOf }) => valueOf(p.multiDay) });

      required(p.finishedArticleId, { message: 'Choisis le produit fini' });
      required(p.plannedBottles, { message: 'Indique le nombre de bouteilles' });
      min(p.plannedBottles, 1, { message: 'Au moins une bouteille' });
      validate(p.plannedBottles, ({ value }) =>
        value() !== null && !Number.isInteger(value())
          ? { kind: 'integer', message: 'Un nombre entier de bouteilles' }
          : undefined,
      );
      required(p.bottleVolumeCl, { message: 'Indique la contenance' });
      min(p.bottleVolumeCl, 1, { message: 'Contenance invalide' });
      max(p.bottleVolumeCl, 10000, { message: 'Contenance invalide' });

      hidden(p.sourceTankId, { when: ({ valueOf }) => valueOf(path.location) !== 'ON_SITE' });
      required(p.sourceTankId, {
        message: 'Choisis la cuve dont le vin sera tiré',
        when: ({ valueOf }) => valueOf(path.location) === 'ON_SITE',
      });
      hidden(p.wineDescription, {
        when: ({ valueOf }) => valueOf(path.location) !== 'AT_PRODUCER',
      });
      maxLength(p.wineDescription, 200, { message: '200 caractères au maximum' });

      required(p.appellationId, { message: "Choisis l'appellation : elle fait le numéro de lot" });
      min(p.vintage, 1900, { message: 'Millésime invalide' });
      max(p.vintage, 2100, { message: 'Millésime invalide' });

      applyEach(p.materials, (material) => {
        required(material.articleId, { message: 'Choisis un article' });
        required(material.plannedQuantity, { message: 'Indique la quantité' });
        min(material.plannedQuantity, 0.0001, { message: 'La quantité doit être positive' });
        validate(material.articleId, ({ value, valueOf }) => {
          const articleId = value();
          const count = valueOf(p.materials).filter(
            (other) => other.articleId === articleId,
          ).length;
          return articleId && count > 1
            ? { kind: 'duplicate', message: 'Déjà dans la liste' }
            : undefined;
        });
      });

      applyEach(p.allocations, (allocation) => {
        required(allocation.quantity, { message: 'Indique les bouteilles' });
        min(allocation.quantity, 1, { message: 'Au moins une bouteille' });
        validate(allocation.orderLineId, ({ value, valueOf }) => {
          const option = this.allocationOptions().get(value());
          return option && option.articleId !== valueOf(p.finishedArticleId)
            ? { kind: 'otherProduct', message: 'Cette commande attend un autre produit' }
            : undefined;
        });
      });
      validate(p.allocations, ({ value, valueOf }) => {
        const total = value().reduce((sum, a) => sum + (a.quantity ?? 0), 0);
        const planned = valueOf(p.plannedBottles);
        return planned !== null && total > planned
          ? {
              kind: 'overAllocated',
              message: `Les commandes réservent ${total} bouteilles, la production n'en prévoit que ${planned}`,
            }
          : undefined;
      });
    });
  });

  // ---------- Ce qu'on affiche à côté des champs ----------

  protected readonly totalBottles = computed(() =>
    this.model().productions.reduce((sum, p) => sum + (p.plannedBottles ?? 0), 0),
  );

  protected article(articleId: string): StockOverviewRow | undefined {
    return this.articlesById().get(articleId);
  }

  protected tank(tankId: string): Tank | undefined {
    return this.tankOptions().find((tank) => tank.id === tankId);
  }

  protected wineNeeded(index: number): number {
    const p = this.model().productions[index];
    return p?.plannedBottles && p.bottleVolumeCl
      ? wineNeededHl(p.plannedBottles, p.bottleVolumeCl)
      : 0;
  }

  /**
   * Le numéro de lot de la production : celui déjà attribué s'il tient toujours,
   * sinon son début (LBX24) — l'API ajoute le numéro d'ordre à l'enregistrement.
   */
  protected lotPreview(index: number): { text: string; definitive: boolean } | null {
    const p = this.model().productions[index];
    if (!p) {
      return null;
    }
    if (p.lotNumber && p.appellationId === p.lotAppellationId && p.vintage === p.lotVintage) {
      return { text: p.lotNumber, definitive: true };
    }
    const appellation = this.allAppellations().find((a) => a.id === p.appellationId);
    return appellation
      ? { text: lotPrefix(appellation.code, p.vintage) + '··', definitive: false }
      : null;
  }

  protected canRescale(index: number): boolean {
    const p = this.model().productions[index];
    return (
      !!p?.materialsBasis &&
      !!p.plannedBottles &&
      p.materialsBasis !== p.plannedBottles &&
      p.materials.length > 0
    );
  }

  // ---------- Les productions ----------

  private updateProduction(index: number, change: (p: ProductionModel) => ProductionModel): void {
    this.model.update((model) => ({
      ...model,
      productions: model.productions.map((p, i) => (i === index ? change(p) : p)),
    }));
  }

  /** Une production de plus, à la suite de la dernière : l'après-midi si la dernière est le matin. */
  protected addProduction(): void {
    const productions = this.model().productions;
    const last = productions[productions.length - 1];
    const next = emptyProduction(
      last ? (last.multiDay ? last.endDate : last.startDate) : todayLocal(),
    );
    if (last && !last.multiDay && last.slot === 'MORNING') {
      next.slot = 'AFTERNOON';
    }
    if (last) {
      next.sourceTankId = last.sourceTankId;
      next.appellationId = last.appellationId;
      next.vintage = last.vintage;
      next.bottleVolumeCl = last.bottleVolumeCl;
    }
    this.model.update((model) => ({ ...model, productions: [...model.productions, next] }));
  }

  protected removeProduction(index: number): void {
    this.model.update((model) => ({
      ...model,
      productions: model.productions.filter((_, i) => i !== index),
    }));
  }

  protected setMultiDay(index: number, multiDay: boolean): void {
    this.updateProduction(index, (p) => ({
      ...p,
      multiDay,
      endDate: multiDay && p.endDate <= p.startDate ? addDays(p.startDate, 1) : p.endDate,
      slot: multiDay ? 'FULL_DAY' : p.slot,
    }));
  }

  /** La cuve choisie : son vin donne l'appellation et le millésime, s'ils ne sont pas déjà remplis. */
  protected tankChanged(index: number, tankId: string): void {
    const lot = this.tank(tankId)?.wineLot;
    if (!lot) {
      return;
    }
    const appellation = matchAppellation(
      lot.appellation,
      this.allAppellations().filter((a) => a.active),
    );
    this.updateProduction(index, (p) => ({
      ...p,
      appellationId: p.appellationId || appellation?.id || '',
      vintage: p.vintage ?? lot.vintage ?? null,
    }));
  }

  // ---------- Les matières d'une production ----------

  protected addMaterial(index: number): void {
    this.updateProduction(index, (p) => ({
      ...p,
      materials: [...p.materials, { articleId: '', plannedQuantity: p.plannedBottles }],
      materialsBasis: p.materialsBasis ?? p.plannedBottles,
    }));
  }

  protected removeMaterial(index: number, line: number): void {
    this.updateProduction(index, (p) => ({
      ...p,
      materials: p.materials.filter((_, i) => i !== line),
    }));
  }

  /** Reprend la liste d'une production précédente, à l'échelle du nombre de bouteilles de celle-ci. */
  protected copyFrom(index: number, key: string): void {
    const source = this.previousOptions().find((option) => option.key === key);
    if (!source) {
      return;
    }
    this.updateProduction(index, (p) => {
      const bottles = p.plannedBottles ?? source.plannedBottles;
      const ratio = bottles / source.plannedBottles;
      return {
        ...p,
        plannedBottles: bottles,
        materials: source.materials.map((line) => ({
          articleId: line.articleId,
          plannedQuantity: scale(line.plannedQuantity, ratio, line.unitCode),
        })),
        materialsBasis: bottles,
      };
    });
  }

  /** Le nombre de bouteilles a changé : toutes les quantités suivent, dans la même proportion. */
  protected rescale(index: number): void {
    this.updateProduction(index, (p) => {
      if (!p.materialsBasis || !p.plannedBottles) {
        return p;
      }
      const ratio = p.plannedBottles / p.materialsBasis;
      return {
        ...p,
        materials: p.materials.map((line) => ({
          ...line,
          plannedQuantity:
            line.plannedQuantity === null
              ? null
              : scale(line.plannedQuantity, ratio, this.article(line.articleId)?.unitCode),
        })),
        materialsBasis: p.plannedBottles,
      };
    });
  }

  // ---------- Les commandes servies ----------

  protected allocationOption(orderLineId: string): AllocationOption | undefined {
    return this.allocationOptions().get(orderLineId);
  }

  protected addableAllocations(index: number): AllocationOption[] {
    const p = this.model().productions[index];
    const taken = new Set(
      this.model().productions.flatMap((x) => x.allocations.map((a) => a.orderLineId)),
    );
    return [...this.allocationOptions().values()].filter(
      (option) =>
        option.articleId === p?.finishedArticleId &&
        !taken.has(option.orderLineId) &&
        (option.missing ?? 1) > 0,
    );
  }

  protected allocatedBottles(index: number): number {
    return (this.model().productions[index]?.allocations ?? []).reduce(
      (sum, a) => sum + (a.quantity ?? 0),
      0,
    );
  }

  protected addAllocation(index: number, orderLineId: string): void {
    const option = this.allocationOption(orderLineId);
    if (!option) {
      return;
    }
    this.updateProduction(index, (p) => {
      const free = Math.max(0, (p.plannedBottles ?? 0) - this.allocatedBottles(index));
      const quantity = Math.min(option.missing ?? free, free) || option.missing || null;
      return { ...p, allocations: [...p.allocations, { orderLineId, quantity }] };
    });
  }

  protected removeAllocation(index: number, line: number): void {
    this.updateProduction(index, (p) => ({
      ...p,
      allocations: p.allocations.filter((_, i) => i !== line),
    }));
  }

  // ---------- Enregistrement ----------

  protected async save(): Promise<void> {
    await submit(this.bottlingForm, {
      action: async () => {
        const value = this.model();
        const request: BottlingRequest = {
          location: value.location,
          contractor: value.contractor.trim() || null,
          notes: value.notes.trim() || null,
          productions: value.productions.map((p) => ({
            id: p.id,
            startDate: p.startDate,
            endDate: p.multiDay ? p.endDate : null,
            slot: p.multiDay ? 'FULL_DAY' : p.slot,
            finishedArticleId: p.finishedArticleId,
            plannedBottles: p.plannedBottles!,
            bottleVolumeCl: p.bottleVolumeCl!,
            sourceTankId: value.location === 'ON_SITE' ? p.sourceTankId : null,
            wineDescription:
              value.location === 'AT_PRODUCER' ? p.wineDescription.trim() || null : null,
            appellationId: p.appellationId,
            vintage: p.vintage,
            materials: p.materials.map((line) => ({
              articleId: line.articleId,
              plannedQuantity: line.plannedQuantity!,
            })),
            allocations: p.allocations.map((a) => ({
              orderLineId: a.orderLineId,
              quantity: a.quantity!,
            })),
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
