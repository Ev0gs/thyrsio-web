import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Bottling, BottlingRequest, CloseBottlingRequest } from './production.models';

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

  cancelBottling(id: string): Promise<Bottling> {
    return firstValueFrom(this.http.post<Bottling>(`${this.baseUrl}/${id}/cancel`, null));
  }

  closeBottling(id: string, request: CloseBottlingRequest): Promise<Bottling> {
    return firstValueFrom(this.http.post<Bottling>(`${this.baseUrl}/${id}/close`, request));
  }
}
