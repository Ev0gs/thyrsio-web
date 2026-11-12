import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronLeft,
  lucidePencil,
  lucidePrinter,
  lucideRotateCw,
  lucideTruck,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemMessage } from '../../../core/api/problem';
import { LocationMap, MapPoint } from '../../../shared/ui/location-map/location-map';
import { INCOTERMS } from '../../referentiel/referentiel.models';
import { Order } from '../../sales/sales.models';
import { ShipmentForm } from '../shipment-form/shipment-form';
import { ShipmentStatusBadge } from '../shipment-status-badge/shipment-status-badge';
import { ShippingApi } from '../shipping-api';
import { Shipment } from '../shipping.models';

type DialogKind = 'edit' | 'cancel' | 'ship';

/** Un chargement : ce qui part, de quels lots, et la validation du départ (le stock sort à ce moment-là). */
@Component({
  selector: 'app-shipment-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    LocationMap,
    ShipmentForm,
    ShipmentStatusBadge,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideBan,
      lucideChevronLeft,
      lucidePencil,
      lucidePrinter,
      lucideRotateCw,
      lucideTruck,
    }),
  ],
  templateUrl: './shipment-detail.html',
})
export class ShipmentDetail {
  private readonly api = inject(ShippingApi);

  readonly id = input.required<string>();

  protected readonly resource = httpResource<Shipment>(
    () => `/api/shipping/shipments/${this.id()}`,
  );
  protected readonly shipment = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  /** La commande, pour modifier le chargement (ce qui reste à expédier par ligne). */
  private readonly orderResource = httpResource<Order>(() => {
    const shipment = this.shipment();
    return shipment && shipment.status === 'DRAFT'
      ? `/api/sales/orders/${shipment.orderId}`
      : undefined;
  });
  protected readonly order = computed(() =>
    this.orderResource.hasValue() ? this.orderResource.value() : null,
  );

  protected readonly incotermLabel = computed(() => {
    const code = this.shipment()?.incoterm;
    return code ? (INCOTERMS.find((incoterm) => incoterm.code === code)?.label ?? code) : null;
  });

  protected readonly deliveryPoint = computed<MapPoint[]>(() => {
    const shipment = this.shipment();
    return shipment?.deliveryLocation
      ? [
          {
            id: shipment.id,
            label: this.addressLines()[0] ?? shipment.clientName,
            location: shipment.deliveryLocation,
            primary: true,
          },
        ]
      : [];
  });

  protected readonly addressLines = computed(
    () => this.shipment()?.deliveryAddressText.split('\n') ?? [],
  );

  protected readonly dialog = signal<DialogKind | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected openDialog(kind: DialogKind): void {
    this.actionError.set(null);
    this.dialog.set(kind);
  }

  protected onSaved(): void {
    this.dialog.set(null);
    this.resource.reload();
    this.orderResource.reload();
  }

  protected async ship(): Promise<void> {
    await this.run(() => this.api.ship(this.id()));
  }

  protected async cancel(): Promise<void> {
    await this.run(() => this.api.cancelShipment(this.id()));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.actionError.set(null);
    this.busy.set(true);
    try {
      await action();
      this.dialog.set(null);
      this.resource.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
