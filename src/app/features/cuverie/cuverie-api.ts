import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AnalysisRequest,
  CreateTankRequest,
  LossRequest,
  MeasureRequest,
  ReceptionRequest,
  Tank,
  TankMovement,
  TankStatus,
  TransferRequest,
  UpdateTankRequest,
  UpdateWineLotRequest,
  WineAnalysis,
  WineLot,
} from './cuverie.models';

/** Les écritures du module cuverie. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class CuverieApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/cuverie';

  // ---------- Cuves ----------

  createTank(request: CreateTankRequest): Promise<Tank> {
    return firstValueFrom(this.http.post<Tank>(`${this.baseUrl}/tanks`, request));
  }

  updateTank(id: string, request: UpdateTankRequest): Promise<Tank> {
    return firstValueFrom(this.http.put<Tank>(`${this.baseUrl}/tanks/${id}`, request));
  }

  changeTankStatus(id: string, status: TankStatus): Promise<Tank> {
    return firstValueFrom(this.http.put<Tank>(`${this.baseUrl}/tanks/${id}/status`, { status }));
  }

  setTankActive(id: string, active: boolean): Promise<void> {
    const action = active ? 'reactivate' : 'archive';
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/tanks/${id}/${action}`, null));
  }

  // ---------- Mouvements de vin ----------

  receive(request: ReceptionRequest): Promise<WineLot> {
    return firstValueFrom(this.http.post<WineLot>(`${this.baseUrl}/receptions`, request));
  }

  transfer(request: TransferRequest): Promise<TankMovement[]> {
    return firstValueFrom(this.http.post<TankMovement[]>(`${this.baseUrl}/transfers`, request));
  }

  recordLoss(tankId: string, request: LossRequest): Promise<TankMovement> {
    return firstValueFrom(
      this.http.post<TankMovement>(`${this.baseUrl}/tanks/${tankId}/losses`, request),
    );
  }

  measure(tankId: string, request: MeasureRequest): Promise<TankMovement> {
    return firstValueFrom(
      this.http.post<TankMovement>(`${this.baseUrl}/tanks/${tankId}/measurements`, request),
    );
  }

  // ---------- Lots et analyses ----------

  updateWineLot(id: string, request: UpdateWineLotRequest): Promise<WineLot> {
    return firstValueFrom(this.http.put<WineLot>(`${this.baseUrl}/wine-lots/${id}`, request));
  }

  addAnalysis(wineLotId: string, request: AnalysisRequest): Promise<WineAnalysis> {
    return firstValueFrom(
      this.http.post<WineAnalysis>(`${this.baseUrl}/wine-lots/${wineLotId}/analyses`, request),
    );
  }

  deleteAnalysis(analysisId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/analyses/${analysisId}`));
  }
}
