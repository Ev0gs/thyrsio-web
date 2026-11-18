import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StockOverviewRow } from '../stock.models';
import { MovementForm } from './movement-form';

const cork: StockOverviewRow = {
  articleId: 'a1',
  articleCode: 'BCH-LIE-4924',
  articleLabel: 'Bouchon liège 49×24',
  categoryCode: 'BOUCHON',
  categoryLabel: 'Bouchon',
  unitCode: 'U',
  lotTracked: false,
  quantity: 3800,
  alertThreshold: 5000,
  lotsInStock: 0,
  status: 'BELOW_THRESHOLD',
  lastMovementAt: null,
  active: true,
};

function set(element: HTMLElement, selector: string, value: string) {
  const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('change'));
}

describe('MovementForm', () => {
  it('shows errors and calls no API when the form is incomplete', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(MovementForm);
    fixture.componentRef.setInput('articles', []);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis un article');
    expect(fixture.nativeElement.textContent).toContain('Indique une quantité');
    http.expectNone('/api/stock/movements');
  });

  it('records a reception of corks without any lot', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MovementForm);
    fixture.componentRef.setInput('articles', [cork]);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    set(element, '#mv-article', 'a1');
    set(element, '#mv-quantity', '6000');
    fixture.detectChanges();
    expect(element.textContent).not.toContain('Lot');
    expect(element.querySelector('#mv-lot')).toBeNull();

    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    const request = http.expectOne({ method: 'POST', url: '/api/stock/movements' });
    expect(request.request.body).toEqual(
      expect.objectContaining({ articleId: 'a1', lotId: null, type: 'RECEPTION', quantity: 6000 }),
    );
    http.expectNone('/api/stock/lots');
  });
});
