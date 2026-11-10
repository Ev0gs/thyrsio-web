import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateMovementRequest, Inventory, LotRow, MovementRow } from './stock.models';

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

  private readonly inventoriesUrl = '/api/stock/inventories';

  createInventory(request: {
    label: string;
    countedAt: string | null;
    notes: string | null;
    prefill: boolean;
  }): Promise<Inventory> {
    return firstValueFrom(this.http.post<Inventory>(this.inventoriesUrl, request));
  }

  addInventoryLine(
    inventoryId: string,
    request: {
      articleId: string;
      lotId: string | null;
      countedQuantity: number | null;
      notes: string | null;
    },
  ): Promise<Inventory> {
    return firstValueFrom(
      this.http.post<Inventory>(`${this.inventoriesUrl}/${inventoryId}/lines`, request),
    );
  }

  countInventoryLine(
    inventoryId: string,
    lineId: string,
    countedQuantity: number,
    notes: string | null,
  ): Promise<Inventory> {
    return firstValueFrom(
      this.http.put<Inventory>(`${this.inventoriesUrl}/${inventoryId}/lines/${lineId}`, {
        countedQuantity,
        notes,
      }),
    );
  }

  removeInventoryLine(inventoryId: string, lineId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.inventoriesUrl}/${inventoryId}/lines/${lineId}`),
    );
  }

  validateInventory(inventoryId: string): Promise<Inventory> {
    return firstValueFrom(
      this.http.post<Inventory>(`${this.inventoriesUrl}/${inventoryId}/validate`, null),
    );
  }

  cancelInventory(inventoryId: string): Promise<Inventory> {
    return firstValueFrom(
      this.http.post<Inventory>(`${this.inventoriesUrl}/${inventoryId}/cancel`, null),
    );
  }
}
