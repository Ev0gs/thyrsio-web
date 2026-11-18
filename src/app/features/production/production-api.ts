import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Bottling, BottlingRequest, CloseProductionRequest } from './production.models';

/** Les écritures du module production. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class ProductionApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/production/bottlings';

  getBottling(id: string): Promise<Bottling> {
    return firstValueFrom(this.http.get<Bottling>(`${this.baseUrl}/${id}`));
  }

  createBottling(request: BottlingRequest): Promise<Bottling> {
    return firstValueFrom(this.http.post<Bottling>(this.baseUrl, request));
  }

  updateBottling(id: string, request: BottlingRequest): Promise<Bottling> {
    return firstValueFrom(this.http.put<Bottling>(`${this.baseUrl}/${id}`, request));
  }

  /** Annule ce qui reste à faire ; les productions déjà clôturées restent. */
  cancelBottling(id: string): Promise<Bottling> {
    return firstValueFrom(this.http.post<Bottling>(`${this.baseUrl}/${id}/cancel`, null));
  }

  cancelProduction(id: string, productionId: string): Promise<Bottling> {
    return firstValueFrom(
      this.http.post<Bottling>(`${this.baseUrl}/${id}/productions/${productionId}/cancel`, null),
    );
  }

  closeProduction(
    id: string,
    productionId: string,
    request: CloseProductionRequest,
  ): Promise<Bottling> {
    return firstValueFrom(
      this.http.post<Bottling>(`${this.baseUrl}/${id}/productions/${productionId}/close`, request),
    );
  }
}
