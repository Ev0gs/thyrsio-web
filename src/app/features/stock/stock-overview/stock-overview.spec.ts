import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StockOverview } from './stock-overview';

describe('StockOverview', () => {
  it('requests the stock overview when it opens', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(StockOverview);
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/stock/overview');
    expect(fixture.nativeElement.textContent).toContain('Matières sèches');
  });
});
