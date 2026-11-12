import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Shipment } from '../shipping.models';
import { DeliveryNote } from './delivery-note';

const shipment: Shipment = {
  id: 's1',
  code: 'EX-26-002',
  status: 'DRAFT',
  orderId: 'o1',
  orderCode: 'CC-26-001',
  customerReference: 'PO-7781',
  incoterm: 'FCA',
  clientId: 'c1',
  clientCode: 'TOKYO-WINE',
  clientName: 'Tokyo Wine Import',
  clientAddress: '1-2-3 Ginza\n104-0061 Tokyo\nJP',
  clientVatNumber: null,
  clientExciseNumber: 'JP-EXC-42',
  clientLanguage: 'en',
  deliveryAddressText: 'Entrepôt Yokohama\n5 Port Road\nYokohama\nJP',
  deliveryLocation: { latitude: 35.4437, longitude: 139.638, approximate: false },
  plannedDate: '2026-11-20',
  carrier: 'Transports Dupont',
  transportReference: 'MSKU 123456-7',
  notes: null,
  lines: [
    {
      id: 'sl1',
      orderLineId: 'l1',
      articleId: 'a1',
      articleCode: 'PF-CDB22-75',
      articleLabel: 'Côtes de Bourg 2022 · 75 cl',
      lotId: 'lot1',
      lotNumber: 'L26310-1',
      quantity: 600,
      orderedQuantity: 3600,
      remainingQuantity: 3600,
    },
  ],
  totalBottles: 600,
  shippedAt: null,
  shippedBy: null,
  createdBy: 'pierre',
  createdAt: '2026-11-10T09:00:00Z',
  updatedAt: '2026-11-10T09:00:00Z',
};

describe('DeliveryNote', () => {
  it('prints the delivery address, the lots and a provisional notice before departure', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(DeliveryNote);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/shipping/shipments/s1').flush(shipment);
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('EX-26-002');
    expect(text).toContain('Entrepôt Yokohama');
    expect(text).toContain('L26310-1');
    expect(text).toContain('JP-EXC-42');
    expect(text).toContain('MSKU 123456-7');
    expect(text).toContain('Provisoire');
  });
});
