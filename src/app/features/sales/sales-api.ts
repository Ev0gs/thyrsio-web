import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreateOrderRequest, Order, UpdateOrderRequest } from './sales.models';

/** Les écritures du module ventes. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class SalesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/sales/orders';

  createOrder(request: CreateOrderRequest): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(this.baseUrl, request));
  }

  updateOrder(id: string, request: UpdateOrderRequest): Promise<Order> {
    return firstValueFrom(this.http.put<Order>(`${this.baseUrl}/${id}`, request));
  }

  confirmOrder(id: string): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(`${this.baseUrl}/${id}/confirm`, null));
  }

  cancelOrder(id: string): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(`${this.baseUrl}/${id}/cancel`, null));
  }
}
