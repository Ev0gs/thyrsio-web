import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ArticleRow,
  ClientRow,
  CreateArticleRequest,
  CreateClientRequest,
  DeliveryAddress,
  DeliveryAddressRequest,
  SupplierDetail,
  SupplierRequest,
  UpdateArticleRequest,
  UpdateClientRequest,
} from './referentiel.models';

type ArchivableResource = 'articles' | 'suppliers' | 'clients';

/** Les écritures du référentiel. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class ReferentielApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/referentiel';

  // ---------- Articles ----------

  createArticle(request: CreateArticleRequest): Promise<ArticleRow> {
    return firstValueFrom(this.http.post<ArticleRow>(`${this.baseUrl}/articles`, request));
  }

  updateArticle(id: string, request: UpdateArticleRequest): Promise<ArticleRow> {
    return firstValueFrom(this.http.put<ArticleRow>(`${this.baseUrl}/articles/${id}`, request));
  }

  // ---------- Fournisseurs ----------

  createSupplier(request: SupplierRequest): Promise<SupplierDetail> {
    return firstValueFrom(this.http.post<SupplierDetail>(`${this.baseUrl}/suppliers`, request));
  }

  updateSupplier(id: string, request: SupplierRequest): Promise<SupplierDetail> {
    return firstValueFrom(
      this.http.put<SupplierDetail>(`${this.baseUrl}/suppliers/${id}`, request),
    );
  }

  // ---------- Clients ----------

  createClient(request: CreateClientRequest): Promise<ClientRow> {
    return firstValueFrom(this.http.post<ClientRow>(`${this.baseUrl}/clients`, request));
  }

  updateClient(id: string, request: UpdateClientRequest): Promise<ClientRow> {
    return firstValueFrom(this.http.put<ClientRow>(`${this.baseUrl}/clients/${id}`, request));
  }

  // ---------- Archivage, commun aux trois ----------

  /** Archive ou réactive : deux routes POST côté API, ni DELETE ni PUT. */
  setActive(resource: ArchivableResource, id: string, active: boolean): Promise<void> {
    const action = active ? 'reactivate' : 'archive';
    return firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/${resource}/${id}/${action}`, null),
    );
  }

  // ---------- Adresses de livraison (sous-ressource d'un client) ----------

  private addressesUrl(clientId: string): string {
    return `${this.baseUrl}/clients/${clientId}/delivery-addresses`;
  }

  createAddress(clientId: string, request: DeliveryAddressRequest): Promise<DeliveryAddress> {
    return firstValueFrom(this.http.post<DeliveryAddress>(this.addressesUrl(clientId), request));
  }

  updateAddress(
    clientId: string,
    addressId: string,
    request: DeliveryAddressRequest,
  ): Promise<DeliveryAddress> {
    return firstValueFrom(
      this.http.put<DeliveryAddress>(`${this.addressesUrl(clientId)}/${addressId}`, request),
    );
  }

  setAddressActive(clientId: string, addressId: string, active: boolean): Promise<void> {
    const action = active ? 'reactivate' : 'archive';
    return firstValueFrom(
      this.http.post<void>(`${this.addressesUrl(clientId)}/${addressId}/${action}`, null),
    );
  }
}
