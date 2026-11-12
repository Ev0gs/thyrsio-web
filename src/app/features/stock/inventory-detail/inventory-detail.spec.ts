import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Inventory } from '../stock.models';
import { InventoryDetail } from './inventory-detail';

const draft: Inventory = {
  id: 'inv-1',
  label: 'Inventaire annuel',
  status: 'DRAFT',
  countedAt: '2026-11-10T11:00:00Z',
  notes: null,
  createdBy: 'u1',
  createdAt: '2026-11-10T11:00:00Z',
  validatedBy: null,
  validatedAt: null,
  lines: [
    {
      id: 'l1',
      articleId: 'a1',
      articleCode: 'CRT-6',
      articleLabel: 'Carton 6',
      unitCode: 'U',
      lotId: null,
      lotNumber: null,
      theoreticalQuantity: 100,
      countedQuantity: 95,
      difference: -5,
      notes: null,
    },
    {
      id: 'l2',
      articleId: 'a2',
      articleCode: 'CRX-6',
      articleLabel: 'Croisillon',
      unitCode: 'U',
      lotId: null,
      lotNumber: null,
      theoreticalQuantity: 40,
      countedQuantity: null,
      difference: null,
      notes: null,
    },
  ],
};

describe('InventoryDetail', () => {
  it('keeps validation disabled while a line is not counted', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(InventoryDetail);
    fixture.componentRef.setInput('id', 'inv-1');
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/stock/inventories/inv-1').flush(draft);
    // Un brouillon charge aussi les articles (pour l'ajout de ligne) : sans réponse, whenStable() attendrait sans fin.
    // Cette requête part une fois l'inventaire reçu : on laisse d'abord passer un tour.
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    http.expectOne('/api/stock/overview').flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('1 / 2 lignes comptées');
    const validate = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.includes("Valider l'inventaire"),
    ) as HTMLButtonElement;
    expect(validate.disabled).toBe(true);
  });
});
