import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { aBottling, aProduction } from '../production.testing';
import { BottlingPlanning } from './bottling-planning';

describe('BottlingPlanning', () => {
  it('shows a two-day bottling on both days and warns about its shortages', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(BottlingPlanning);
    fixture.componentRef.setInput('semaine', '2026-11-09');
    fixture.detectChanges();
    TestBed.tick();

    // Une mise de deux jours, et une autre qui fait deux produits le jeudi : l'après-midi saisi en premier
    const twoDays = aBottling({
      productions: [
        aProduction({
          startDate: '2026-11-10',
          endDate: '2026-11-11',
          shortageCount: 2,
          alert: true,
          allocations: [
            {
              orderLineId: 'l1',
              orderId: 'o1',
              orderCode: 'CC-26-001',
              clientName: 'Tokyo Wine',
              quantity: 3600,
            },
          ],
        }),
      ],
    });
    const sameDay = aBottling({
      id: 'b2',
      code: 'MB-26-002',
      productions: [
        aProduction({
          id: 'p3',
          startDate: '2026-11-12',
          endDate: '2026-11-12',
          slot: 'AFTERNOON',
          finishedArticleLabel: 'Bordeaux Supérieur 2023 · France',
          lotNumber: 'LBXS2304',
        }),
        aProduction({
          id: 'p2',
          startDate: '2026-11-12',
          endDate: '2026-11-12',
          slot: 'MORNING',
          finishedArticleLabel: 'Bordeaux Supérieur 2023 · Japon',
          lotNumber: 'LBXS2303',
        }),
      ],
    });
    const page = {
      content: [twoDays, sameDay],
      page: { size: 200, number: 0, totalElements: 2, totalPages: 1 },
    };
    http.expectOne((request) => request.params.get('from') === '2026-11-09').flush(page);
    http.expectOne((request) => request.params.get('status') === 'PLANNED,IN_PROGRESS').flush(page);
    // Les ventes sont masquées (FEATURES.sales) : pas de lignes de commande à planifier
    http.expectNone('/api/sales/order-lines/to-plan');
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Semaine 46');
    expect(text).toContain('jour 1/2');
    expect(text).toContain('jour 2/2');
    expect(text).toContain('Cuve C11');
    expect(text).not.toContain('CC-26-001'); // la commande servie n'est pas affichée sans les ventes
    expect(text).toContain(
      '1 production(s) dans les 10 prochains jours manquent de matières sèches',
    );
    expect(text).toContain('Lot LCDB2201');

    // Le jeudi : le matin (Japon) avant l'après-midi (France), chacun avec son lot
    const thursday = [...fixture.nativeElement.querySelectorAll('section')].find(
      (section: HTMLElement) =>
        section.textContent!.includes('LBXS2303') && !section.textContent!.includes('À venir'),
    ) as HTMLElement;
    const cards = [...thursday.querySelectorAll('a')].map((card) =>
      card.textContent!.replace(/\s+/g, ' '),
    );
    expect(cards.length).toBe(2);
    expect(cards[0]).toContain('Matin');
    expect(cards[0]).toContain('Japon');
    expect(cards[0]).toContain('LBXS2303');
    expect(cards[1]).toContain('Après-midi');
    expect(cards[1]).toContain('LBXS2304');
  });
});
