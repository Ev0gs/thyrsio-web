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
import { BalanceRow } from '../../stock/stock.models';
import { Order, OrderLine } from '../../sales/sales.models';
import { ShippingApi } from '../shipping-api';
import { Shipment } from '../shipping.models';

interface LineModel {
  orderLineId: string;
  lotId: string;
  quantity: number | null;
}

interface ShipmentModel {
  plannedDate: string;
  carrier: string;
  transportReference: string;
  notes: string;
  lines: LineModel[];
}

/** Une nouvelle expédition reprend tout ce qui reste à expédier ; une expédition existante, ses lignes. */
const toModel = (order: Order, shipment: Shipment | null): ShipmentModel => ({
  plannedDate: shipment?.plannedDate ?? order.requestedLoadingDate ?? todayLocal(),
  carrier: shipment?.carrier ?? '',
  transportReference: shipment?.transportReference ?? '',
  notes: shipment?.notes ?? '',
  lines: shipment
    ? shipment.lines.map((l) => ({
        orderLineId: l.orderLineId,
        lotId: l.lotId ?? '',
        quantity: l.quantity,
      }))
    : order.lines
        .filter((line) => line.remaining > 0)
        .map((line) => ({ orderLineId: line.id, lotId: '', quantity: line.remaining })),
});

/** Préparer le chargement d'une commande : pour chaque produit, le lot de bouteilles et la quantité. */
@Component({
  selector: 'app-shipment-form',
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
  templateUrl: './shipment-form.html',
})
export class ShipmentForm {
  readonly order = input.required<Order>();
  /** null : nouvelle expédition ; une expédition en préparation : modification. */
  readonly shipment = input<Shipment | null>(null);
  readonly saved = output<Shipment>();
  readonly cancelled = output<void>();

  private readonly api = inject(ShippingApi);

  protected readonly selectClass = SELECT_CLASS;

  /** Les soldes non nuls : les lots de bouteilles disponibles, en une requête. */
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

  private readonly orderLines = computed(
    () => new Map(this.order().lines.map((line) => [line.id, line])),
  );

  protected readonly model = linkedSignal(() => toModel(this.order(), this.shipment()));

  protected readonly shipmentForm = form(this.model, (path) => {
    required(path.plannedDate, { message: 'Indique la date de chargement' });
    maxLength(path.carrier, 200, { message: '200 caractères au maximum' });
    maxLength(path.transportReference, 100, { message: '100 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });
    applyEach(path.lines, (line) => {
      required(line.lotId, { message: 'Choisis le lot' });
      required(line.quantity, { message: 'Indique la quantité' });
      min(line.quantity, 1, { message: 'Au moins une bouteille' });
      validate(line.quantity, ({ value, valueOf }) => {
        const quantity = value();
        if (quantity === null) {
          return undefined;
        }
        const lot = this.lotsFor(valueOf(line.orderLineId)).find(
          (b) => b.lotId === valueOf(line.lotId),
        );
        if (lot && quantity > lot.quantity) {
          return {
            kind: 'stock',
            message: `Le lot ${lot.lotNumber} n'en contient que ${lot.quantity}`,
          };
        }
        // Toutes les lignes du même produit ensemble ne dépassent pas ce qui reste dû
        const orderLine = this.orderLines().get(valueOf(line.orderLineId));
        const loaded = valueOf(path.lines)
          .filter((other) => other.orderLineId === valueOf(line.orderLineId))
          .reduce((sum, other) => sum + (other.quantity ?? 0), 0);
        return orderLine && loaded > orderLine.remaining
          ? {
              kind: 'remaining',
              message: `Il ne reste que ${orderLine.remaining} bouteilles à expédier`,
            }
          : undefined;
      });
    });
  });

  constructor() {
    // Une fois les soldes reçus : un produit qui n'a qu'un seul lot en stock le reçoit d'office
    effect(() => {
      if (this.lotsByArticle().size === 0) {
        return;
      }
      untracked(() =>
        this.model.update((model) => ({
          ...model,
          lines: model.lines.map((line) => {
            const lots = this.lotsFor(line.orderLineId);
            return !line.lotId && lots.length === 1 ? { ...line, lotId: lots[0].lotId! } : line;
          }),
        })),
      );
    });
  }

  protected orderLine(orderLineId: string): OrderLine | undefined {
    return this.orderLines().get(orderLineId);
  }

  protected lotsFor(orderLineId: string): BalanceRow[] {
    const articleId = this.orderLines().get(orderLineId)?.articleId;
    return articleId ? (this.lotsByArticle().get(articleId) ?? []) : [];
  }

  protected readonly totalBottles = computed(() =>
    this.model().lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0),
  );

  /** Un produit pris dans deux lots : une ligne de plus. */
  protected addLot(index: number): void {
    this.model.update((model) => {
      const lines = [...model.lines];
      lines.splice(index + 1, 0, {
        orderLineId: lines[index].orderLineId,
        lotId: '',
        quantity: null,
      });
      return { ...model, lines };
    });
  }

  protected removeLine(index: number): void {
    this.model.update((model) => ({ ...model, lines: model.lines.filter((_, i) => i !== index) }));
  }

  protected async save(): Promise<void> {
    await submit(this.shipmentForm, {
      action: async () => {
        const value = this.model();
        const request = {
          orderId: this.order().id,
          plannedDate: value.plannedDate,
          carrier: value.carrier.trim() || null,
          transportReference: value.transportReference.trim() || null,
          notes: value.notes.trim() || null,
          lines: value.lines.map((line) => ({
            orderLineId: line.orderLineId,
            lotId: line.lotId,
            quantity: line.quantity!,
          })),
        };
        try {
          const current = this.shipment();
          const saved = current
            ? await this.api.updateShipment(current.id, request)
            : await this.api.createShipment(request);
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return { fieldTree: this.shipmentForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
