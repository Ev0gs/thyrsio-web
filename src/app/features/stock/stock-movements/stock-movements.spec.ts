import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StockMovements } from './stock-movements';

describe('StockMovements', () => {
  it('turns the URL filters into the API request', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(StockMovements);
    // Comme si l'URL était ?type=CONSUMPTION&page=2
    fixture.componentRef.setInput('type', 'CONSUMPTION');
    fixture.componentRef.setInput('page', '2');
    fixture.detectChanges();
    TestBed.tick();

    const request = http.expectOne((r) => r.url === '/api/stock/movements');
    expect(request.request.params.get('type')).toBe('CONSUMPTION');
    expect(request.request.params.get('page')).toBe('1'); // l'API compte à partir de 0
    expect(request.request.params.get('size')).toBe('25');
    http.expectOne('/api/stock/overview');
  });
});
