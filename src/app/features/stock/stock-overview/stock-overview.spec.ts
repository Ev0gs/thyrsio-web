import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { StockOverview } from './stock-overview';

describe('StockOverview', () => {
  it('requests the stock overview when it opens', () => {
    TestBed.configureTestingModule({
      // provideRouter : l'écran contient des liens (routerLink)
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(StockOverview);
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/stock/overview');
    expect(fixture.nativeElement.textContent).toContain('Matières sèches');
  });
});
