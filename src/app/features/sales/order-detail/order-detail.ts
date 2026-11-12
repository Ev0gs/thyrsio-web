import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronLeft,
  lucideCircleCheck,
  lucidePencil,
  lucideRotateCw,
  lucideTruck,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemMessage } from '../../../core/api/problem';
import { countryName } from '../../../core/i18n/countries';
import { LocationMap, MapPoint } from '../../../shared/ui/location-map/location-map';
import { BottlingForm, BottlingPrefill } from '../../production/bottling-form/bottling-form';
import { Bottling } from '../../production/production.models';
import { INCOTERMS } from '../../referentiel/referentiel.models';
import { ShipmentForm } from '../../shipping/shipment-form/shipment-form';
import { ShipmentStatusBadge } from '../../shipping/shipment-status-badge/shipment-status-badge';
import { Shipment } from '../../shipping/shipping.models';
import { OrderForm } from '../order-form/order-form';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';
import { SalesApi } from '../sales-api';
import { isOpen, Order, OrderLine } from '../sales.models';

type DialogKind = 'edit' | 'cancel' | 'ship' | 'plan';

/** La fiche d'une commande : ses lignes, ce qui les couvre, les mises qui les servent, ses expéditions. */
@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    BottlingForm,
    LocationMap,
    OrderForm,
    OrderStatusBadge,
    ShipmentForm,
    ShipmentStatusBadge,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideBan,
      lucideChevronLeft,
      lucideCircleCheck,
      lucidePencil,
      lucideRotateCw,
      lucideTruck,
    }),
  ],
  templateUrl: './order-detail.html',
})
export class OrderDetail {
  private readonly api = inject(SalesApi);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly countryName = countryName;

  protected readonly resource = httpResource<Order>(() => `/api/sales/orders/${this.id()}`);
  protected readonly order = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly dialog = signal<DialogKind | null>(null);
  protected readonly prefill = signal<BottlingPrefill | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly open = computed(() => {
    const order = this.order();
    return !!order && isOpen(order.status);
  });

  /** Modifiable : brouillon, ou confirmée sans rien d'expédié ni de chargement en préparation. */
  protected readonly editable = computed(() => {
    const order = this.order();
    return (
      !!order &&
      (order.status === 'DRAFT' || order.status === 'CONFIRMED') &&
      order.shippedBottles === 0 &&
      !order.shipments.some((shipment) => shipment.status === 'DRAFT')
    );
  });

  /** L'adresse de livraison sur la carte, une fois localisée. */
  protected readonly deliveryPoint = computed<MapPoint[]>(() => {
    const address = this.order()?.deliveryAddress;
    return address?.location
      ? [{ id: address.id, label: address.label, location: address.location, primary: true }]
      : [];
  });

  protected readonly incotermLabel = computed(() => {
    const code = this.order()?.incoterm;
    return code ? (INCOTERMS.find((incoterm) => incoterm.code === code)?.label ?? code) : null;
  });

  protected readonly hasRemaining = computed(
    () => this.order()?.lines.some((line) => line.remaining > 0) ?? false,
  );

  protected openDialog(kind: DialogKind): void {
    this.actionError.set(null);
    this.dialog.set(kind);
  }

  /** « Planifier » sur une ligne : une mise de ce produit, pour ce qui manque, réservée à cette ligne. */
  protected plan(line: OrderLine): void {
    this.prefill.set({
      finishedArticleId: line.articleId,
      plannedBottles: line.missing ?? line.remaining,
      allocations: [{ orderLineId: line.id, quantity: line.missing ?? line.remaining }],
    });
    this.openDialog('plan');
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.resource.reload();
  }

  protected onShipmentSaved(shipment: Shipment): void {
    this.dialog.set(null);
    this.router.navigate(['/ventes/expeditions', shipment.id]);
  }

  protected onBottlingSaved(bottling: Bottling): void {
    this.dialog.set(null);
    this.router.navigate(['/production/mises', bottling.id]);
  }

  protected async confirm(): Promise<void> {
    await this.run(() => this.api.confirmOrder(this.id()));
  }

  protected async cancel(): Promise<void> {
    await this.run(() => this.api.cancelOrder(this.id()));
    if (!this.actionError()) {
      this.dialog.set(null);
    }
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.actionError.set(null);
    this.busy.set(true);
    try {
      await action();
      this.resource.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
