import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateMovementRequest, LotRow, MovementRow } from './stock.models';

/** Les écritures du module stock. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class StockApi {
  private readonly http = inject(HttpClient);

  // firstValueFrom : transforme la réponse HTTP (un Observable) en Promise, pratique avec async/await
  createLot(articleId: string, lotNumber: string): Promise<LotRow> {
    return firstValueFrom(this.http.post<LotRow>('/api/stock/lots', { articleId, lotNumber }));
  }

  recordMovement(request: CreateMovementRequest): Promise<MovementRow> {
    return firstValueFrom(this.http.post<MovementRow>('/api/stock/movements', request));
  }
}
