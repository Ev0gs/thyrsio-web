import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { OrderRow } from '../sales.models';
import { OrderList } from './order-list';

const row = (overrides: Partial<OrderRow>): OrderRow => ({
  id: 'o1',
  code: 'CC-26-001',
  status: 'CONFIRMED',
  clientId: 'c1',
  clientName: 'Tokyo Wine Import',
  clientCountryCode: 'JP',
  customerReference: 'PO-7781',
  orderDate: '2026-11-02',
  requestedLoadingDate: '2026-11-20',
  lineCount: 2,
  totalBottles: 6600,
  shippedBottles: 0,
  missingBottles: 0,
  ...overrides,
});

describe('OrderList', () => {
  it('lists the open orders by loading date and shows what is still to plan', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(OrderList);
    fixture.detectChanges();
    TestBed.tick();

    const request = http.expectOne((r) => r.url === '/api/sales/orders');
    expect(request.request.params.get('open')).toBe('true');
    expect(request.request.params.get('sort')).toBe('requestedLoadingDate,asc');
    request.flush({
      content: [
        row({}),
        row({ id: 'o2', code: 'CC-26-004', clientName: 'Hudson Fine Wines', missingBottles: 2400 }),
      ],
      page: { size: 25, number: 0, totalElements: 2, totalPages: 1 },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('CC-26-001');
    expect(text).toContain('Réf. PO-7781');
    expect(text).toContain('Couverte');
    expect(text).toContain('CC-26-004');
    expect(text).toContain('À planifier');
  });
});
