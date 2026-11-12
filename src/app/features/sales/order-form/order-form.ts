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
import {
  ClientRow,
  DeliveryAddress,
  Incoterm,
  INCOTERMS,
} from '../../referentiel/referentiel.models';
import { StockOverviewRow } from '../../stock/stock.models';
import { SalesApi } from '../sales-api';
import { Order } from '../sales.models';

interface LineModel {
  articleId: string;
  quantity: number | null;
  unitPrice: number | null;
}

interface OrderModel {
  clientId: string;
  deliveryAddressId: string;
  customerReference: string;
  orderDate: string;
  requestedLoadingDate: string;
  incoterm: Incoterm | '';
  notes: string;
  lines: LineModel[];
}

const toModel = (order: Order | null): OrderModel => ({
  clientId: order?.clientId ?? '',
  deliveryAddressId: order?.deliveryAddressId ?? '',
  customerReference: order?.customerReference ?? '',
  orderDate: order?.orderDate ?? todayLocal(),
  requestedLoadingDate: order?.requestedLoadingDate ?? '',
  incoterm: order?.incoterm ?? '',
  notes: order?.notes ?? '',
  lines: order?.lines.map((l) => ({
    articleId: l.articleId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  })) ?? [{ articleId: '', quantity: null, unitPrice: null }],
});

/** Saisir ou modifier une commande. Une commande se crée en brouillon : on la confirme ensuite. */
@Component({
  selector: 'app-order-form',
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
  templateUrl: './order-form.html',
})
export class OrderForm {
  /** null : nouvelle commande ; une commande : modification (le client ne change plus). */
  readonly order = input<Order | null>(null);
  readonly saved = output<Order>();
  readonly cancelled = output<void>();

  private readonly api = inject(SalesApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly incoterms = INCOTERMS;

  // ---------- Les listes de choix ----------

  private readonly clients = httpResource<Page<ClientRow>>(() => ({
    url: '/api/referentiel/clients',
    params: { size: 200, sort: 'name' },
  }));
  private readonly products = httpResource<StockOverviewRow[]>(() => ({
    url: '/api/stock/overview',
    params: { finishedGoods: true },
  }));

  protected readonly model = linkedSignal(() => toModel(this.order()));

  /** Les adresses de livraison du client choisi (pas d'appel tant qu'aucun client n'est choisi). */
  private readonly addresses = httpResource<DeliveryAddress[]>(() => {
    const clientId = this.model().clientId;
    return clientId ? `/api/referentiel/clients/${clientId}/delivery-addresses` : undefined;
  });

  protected readonly clientOptions = computed(() =>
    (this.clients.hasValue() ? this.clients.value().content : []).filter(
      (client) => client.active || client.id === this.order()?.clientId,
    ),
  );
  protected readonly addressOptions = computed(() =>
    (this.addresses.hasValue() ? this.addresses.value() : []).filter(
      (address) => address.active || address.id === this.order()?.deliveryAddressId,
    ),
  );
  protected readonly productOptions = computed(() =>
    (this.products.hasValue() ? this.products.value() : [])
      .filter((row) => row.active)
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );
  private readonly productsById = computed(
    () =>
      new Map(
        (this.products.hasValue() ? this.products.value() : []).map((row) => [row.articleId, row]),
      ),
  );

  protected readonly orderForm = form(this.model, (path) => {
    required(path.clientId, { message: 'Choisis le client' });
    required(path.orderDate, { message: 'Indique la date de commande' });
    validate(path.requestedLoadingDate, ({ value, valueOf }) =>
      value() && value() < valueOf(path.orderDate)
        ? { kind: 'beforeOrder', message: 'Le chargement est avant la commande' }
        : undefined,
    );
    maxLength(path.customerReference, 100, { message: '100 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2000 caractères au maximum' });
    applyEach(path.lines, (line) => {
      required(line.articleId, { message: 'Choisis un produit' });
      required(line.quantity, { message: 'Indique la quantité' });
      min(line.quantity, 1, { message: 'Au moins une bouteille' });
      validate(line.quantity, ({ value }) =>
        value() !== null && !Number.isInteger(value())
          ? { kind: 'integer', message: 'Un nombre entier de bouteilles' }
          : undefined,
      );
      min(line.unitPrice, 0, { message: 'Le prix ne peut pas être négatif' });
      validate(line.articleId, ({ value, valueOf }) => {
        const articleId = value();
        const count = valueOf(path.lines).filter((other) => other.articleId === articleId).length;
        return articleId && count > 1
          ? { kind: 'duplicate', message: 'Déjà dans la commande' }
          : undefined;
      });
    });
  });

  protected readonly selectedClient = computed(() =>
    this.clientOptions().find((client) => client.id === this.model().clientId),
  );

  protected readonly total = computed(() =>
    this.model().lines.reduce(
      (sum, line) => ({
        bottles: sum.bottles + (line.quantity ?? 0),
        amount: sum.amount + (line.quantity ?? 0) * (line.unitPrice ?? 0),
      }),
      { bottles: 0, amount: 0 },
    ),
  );

  constructor() {
    // Nouveau client choisi : on reprend son incoterm par défaut, et l'adresse se recalcule côté API
    effect(() => {
      const client = this.selectedClient();
      if (!client || this.order()) {
        return;
      }
      untracked(() => {
        this.orderForm.deliveryAddressId().value.set('');
        this.orderForm.incoterm().value.set(client.defaultIncoterm ?? '');
      });
    });
  }

  protected product(articleId: string): StockOverviewRow | undefined {
    return this.productsById().get(articleId);
  }

  protected addLine(): void {
    this.model.update((model) => ({
      ...model,
      lines: [...model.lines, { articleId: '', quantity: null, unitPrice: null }],
    }));
  }

  protected removeLine(index: number): void {
    this.model.update((model) => ({ ...model, lines: model.lines.filter((_, i) => i !== index) }));
  }

  protected async save(): Promise<void> {
    await submit(this.orderForm, {
      action: async () => {
        const value = this.model();
        const common = {
          deliveryAddressId: value.deliveryAddressId || null,
          customerReference: value.customerReference.trim() || null,
          requestedLoadingDate: value.requestedLoadingDate || null,
          incoterm: value.incoterm || null,
          notes: value.notes.trim() || null,
          lines: value.lines.map((line) => ({
            articleId: line.articleId,
            quantity: line.quantity!,
            unitPrice: line.unitPrice,
          })),
        };
        try {
          const current = this.order();
          const saved = current
            ? await this.api.updateOrder(current.id, { ...common, orderDate: value.orderDate })
            : await this.api.createOrder({
                ...common,
                clientId: value.clientId,
                orderDate: value.orderDate,
              });
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          return { fieldTree: this.orderForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
