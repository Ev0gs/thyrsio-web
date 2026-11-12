import { Component, computed, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucidePrinter } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { INCOTERMS } from '../../referentiel/referentiel.models';
import { Shipment } from '../shipping.models';

/**
 * Le bon de livraison, à imprimer (hors de la mise en page de l'application).
 * Bilingue français / anglais : la plupart des clients sont à l'export.
 */
@Component({
  selector: 'app-delivery-note',
  imports: [DatePipe, DecimalPipe, RouterLink, NgIcon, HlmButtonImports],
  viewProviders: [provideIcons({ lucideChevronLeft, lucidePrinter })],
  templateUrl: './delivery-note.html',
})
export class DeliveryNote {
  readonly id = input.required<string>();

  protected readonly resource = httpResource<Shipment>(
    () => `/api/shipping/shipments/${this.id()}`,
  );
  protected readonly shipment = computed(() =>
    this.resource.hasValue() ? this.resource.value() : null,
  );

  protected readonly incotermLabel = computed(() => {
    const code = this.shipment()?.incoterm;
    return code ? (INCOTERMS.find((incoterm) => incoterm.code === code)?.label ?? code) : null;
  });

  protected readonly deliveryLines = computed(
    () => this.shipment()?.deliveryAddressText.split('\n') ?? [],
  );
  protected readonly clientLines = computed(() => this.shipment()?.clientAddress.split('\n') ?? []);

  protected print(): void {
    window.print();
  }
}
