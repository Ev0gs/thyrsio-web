import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Shipment, ShipmentRequest } from './shipping.models';

/** Les écritures du module expéditions. */
@Injectable({ providedIn: 'root' })
export class ShippingApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/shipping/shipments';

  createShipment(request: ShipmentRequest): Promise<Shipment> {
    return firstValueFrom(this.http.post<Shipment>(this.baseUrl, request));
  }

  updateShipment(id: string, request: ShipmentRequest): Promise<Shipment> {
    return firstValueFrom(this.http.put<Shipment>(`${this.baseUrl}/${id}`, request));
  }

  cancelShipment(id: string): Promise<Shipment> {
    return firstValueFrom(this.http.post<Shipment>(`${this.baseUrl}/${id}/cancel`, null));
  }

  ship(id: string): Promise<Shipment> {
    return firstValueFrom(this.http.post<Shipment>(`${this.baseUrl}/${id}/ship`, null));
  }
}
