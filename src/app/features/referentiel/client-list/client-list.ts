import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { COMMON_COUNTRIES, countryName } from '../../../core/i18n/countries';
import { LocationMap, MapPoint } from '../../../shared/ui/location-map/location-map';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { ClientForm } from '../client-form/client-form';
import { ReferentielApi } from '../referentiel-api';
import { ClientRow } from '../referentiel.models';

@Component({
  selector: 'app-client-list',
  imports: [
    NgIcon,
    LocationMap,
    Pagination,
    ClientForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
    RouterLink,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw, lucideSearch })],
  templateUrl: './client-list.html',
})
export class ClientList {
  private readonly router = inject(Router);
  private readonly api = inject(ReferentielApi);

  // ---------- L'URL : ?q=tokyo&pays=JP&archives=1&page=2 ----------

  readonly q = input<string>();
  readonly pays = input<string>();
  readonly archives = input<string>();
  /** ?vue=carte : les clients sur une carte plutôt qu'en tableau. */
  readonly vue = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly countries = COMMON_COUNTRIES;
  protected readonly countryName = countryName;
  protected readonly selectClass = SELECT_CLASS;

  protected readonly clients = httpResource<Page<ClientRow>>(() => {
    const params: Record<string, string | number | boolean> = {
      page: this.page() - 1,
      size: 25,
      sort: 'name',
      includeArchived: this.archives() === '1',
    };
    const q = this.q();
    const pays = this.pays();
    if (q) params['search'] = q;
    if (pays) params['countryCode'] = pays;
    return { url: '/api/referentiel/clients', params };
  });

  protected readonly mapView = computed(() => this.vue() === 'carte');

  /** En vue carte : tous les clients du filtre d'un coup (quelques centaines au plus). */
  protected readonly allClients = httpResource<Page<ClientRow>>(() => {
    if (!this.mapView()) {
      return undefined;
    }
    const params: Record<string, string | number | boolean> = {
      size: 1000,
      sort: 'name',
      includeArchived: this.archives() === '1',
    };
    const q = this.q();
    const pays = this.pays();
    if (q) params['search'] = q;
    if (pays) params['countryCode'] = pays;
    return { url: '/api/referentiel/clients', params };
  });

  protected readonly mapClients = computed(() =>
    this.allClients.hasValue() ? this.allClients.value().content : [],
  );
  protected readonly mapPoints = computed<MapPoint[]>(() =>
    this.mapClients()
      .filter((client) => client.location)
      .map((client) => ({
        id: client.id,
        label: client.name,
        detail: [client.city, countryName(client.countryCode)].filter(Boolean).join(', '),
        location: client.location!,
        primary: true,
      })),
  );

  protected setView(map: boolean): void {
    this.router.navigate([], {
      queryParams: { vue: map ? 'carte' : null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected openClient(id: string): void {
    this.router.navigate(['/referentiel/clients', id]);
  }

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly editing = signal<ClientRow | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected open(client: ClientRow | null): void {
    this.editing.set(client);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.clients.reload();
  }

  protected async toggleActive(client: ClientRow): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.setActive('clients', client.id, !client.active);
      this.clients.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }

  protected setFilter(name: 'q' | 'pays' | 'archives', value: string): void {
    this.router.navigate([], {
      queryParams: { [name]: value.trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
