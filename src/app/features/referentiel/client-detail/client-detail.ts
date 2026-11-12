import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideMapPin,
  lucidePencil,
  lucidePlus,
  lucideRotateCw,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { problemMessage } from '../../../core/api/problem';
import { countryName, languageName } from '../../../core/i18n/countries';
import { LocationMap, MapPoint } from '../../../shared/ui/location-map/location-map';
import { AddressForm } from '../address-form/address-form';
import { ClientForm } from '../client-form/client-form';
import { ReferentielApi } from '../referentiel-api';
import { ClientRow, DeliveryAddress, INCOTERMS, toAddressRequest } from '../referentiel.models';

@Component({
  selector: 'app-client-detail',
  imports: [
    NgIcon,
    RouterLink,
    AddressForm,
    ClientForm,
    LocationMap,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
  ],
  viewProviders: [
    provideIcons({ lucideChevronDown, lucideMapPin, lucidePencil, lucidePlus, lucideRotateCw }),
  ],
  templateUrl: './client-detail.html',
})
export class ClientDetail {
  /** Le :id de l'URL. */
  readonly id = input.required<string>();

  private readonly api = inject(ReferentielApi);

  protected readonly countryName = countryName;
  protected readonly languageName = languageName;

  // ---------- Les données ----------

  protected readonly client = httpResource<ClientRow>(
    () => `/api/referentiel/clients/${this.id()}`,
  );

  /** Toutes les adresses, archivées comprises : on les sépare ici. L'API met la par défaut en premier. */
  protected readonly addresses = httpResource<DeliveryAddress[]>(() => ({
    url: `/api/referentiel/clients/${this.id()}/delivery-addresses`,
    params: { includeArchived: true },
  }));

  protected readonly current = computed(() =>
    this.client.hasValue() ? this.client.value() : null,
  );
  private readonly allAddresses = computed(() =>
    this.addresses.hasValue() ? this.addresses.value() : [],
  );
  protected readonly activeAddresses = computed(() =>
    this.allAddresses().filter((address) => address.active),
  );
  protected readonly archivedAddresses = computed(() =>
    this.allAddresses().filter((address) => !address.active),
  );

  /** Le siège (en bordeaux) et les adresses de livraison actives déjà localisées. */
  protected readonly mapPoints = computed<MapPoint[]>(() => {
    const client = this.current();
    const points: MapPoint[] = [];
    if (client?.location) {
      points.push({
        id: client.id,
        label: 'Siège',
        detail: [client.addressLine1, [client.postalCode, client.city].filter(Boolean).join(' ')]
          .filter(Boolean)
          .join(', '),
        location: client.location,
        primary: true,
      });
    }
    for (const address of this.activeAddresses()) {
      if (address.location) {
        points.push({
          id: address.id,
          label: address.label,
          detail: `${address.addressLine1}, ${address.postalCode ?? ''} ${address.city}`.trim(),
          location: address.location,
        });
      }
    }
    return points;
  });

  /** Des adresses existent, mais aucune n'est encore sur la carte. */
  protected readonly waitingForMap = computed(
    () =>
      this.mapPoints().length === 0 &&
      (!!this.current()?.city || this.activeAddresses().length > 0),
  );

  protected readonly incotermLabel = computed(() => {
    const code = this.current()?.defaultIncoterm;
    return code ? (INCOTERMS.find((incoterm) => incoterm.code === code)?.label ?? code) : null;
  });

  // ---------- L'état de l'écran ----------

  protected readonly showArchived = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly clientDialog = signal<'open' | 'closed'>('closed');
  protected readonly addressDialog = signal<'open' | 'closed'>('closed');
  protected readonly editingAddress = signal<DeliveryAddress | null>(null);

  // ---------- Les actions ----------

  protected openAddress(address: DeliveryAddress | null): void {
    this.editingAddress.set(address);
    this.addressDialog.set('open');
  }

  protected onClientSaved(): void {
    this.clientDialog.set('closed');
    this.client.reload();
  }

  protected onAddressSaved(): void {
    this.addressDialog.set('closed');
    this.addresses.reload(); // l'ancienne adresse par défaut a peut-être changé : on relit tout
  }

  /** PUT de l'adresse telle quelle, avec defaultAddress à true : l'API retire le statut à l'ancienne. */
  protected setDefault(address: DeliveryAddress): Promise<void> {
    return this.run(() =>
      this.api.updateAddress(this.id(), address.id, {
        ...toAddressRequest(address),
        defaultAddress: true,
      }),
    );
  }

  protected toggleActive(address: DeliveryAddress): Promise<void> {
    return this.run(() => this.api.setAddressActive(this.id(), address.id, !address.active));
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.error.set(problemMessage(error));
    } finally {
      this.busy.set(false);
      this.addresses.reload();
    }
  }
}
