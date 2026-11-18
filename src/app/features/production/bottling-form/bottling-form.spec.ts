import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { aBottling, aProduction } from '../production.testing';
import { BottlingForm } from './bottling-form';

const products = [
  { articleId: 'jp', articleCode: 'PF-JP', articleLabel: 'Bordeaux Sup. Japon', active: true },
  { articleId: 'fr', articleCode: 'PF-FR', articleLabel: 'Bordeaux Sup. France', active: true },
];
const tanks = [
  {
    id: 't12',
    code: 'C12',
    volumeHl: 100,
    wineLot: {
      id: 'w1',
      code: 'V26-001',
      appellation: 'Bordeaux Supérieur',
      color: 'RED',
      vintage: 2023,
    },
  },
];
const appellations = [
  { id: 'bx', code: 'BX', name: 'Bordeaux', active: true },
  { id: 'bxs', code: 'BXS', name: 'Bordeaux Supérieur', active: true },
];

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(BottlingForm);
  return { http, fixture, element: fixture.nativeElement as HTMLElement };
}

/** Répond aux listes de choix du formulaire. */
async function flushLists(
  http: HttpTestingController,
  fixture: { whenStable(): Promise<unknown>; detectChanges(): void },
) {
  TestBed.tick();
  http
    .expectOne((r) => r.url === '/api/stock/overview' && r.params.get('finishedGoods') === 'true')
    .flush(products);
  http
    .expectOne((r) => r.url === '/api/stock/overview' && !r.params.has('finishedGoods'))
    .flush([]);
  http.expectOne('/api/cuverie/tanks').flush(tanks);
  http.expectOne((r) => r.url === '/api/referentiel/appellations').flush(appellations);
  http
    .expectOne((r) => r.url === '/api/production/bottlings')
    .flush({
      content: [],
      page: { size: 30, number: 0, totalElements: 0, totalPages: 0 },
    });
  await fixture.whenStable();
  fixture.detectChanges();
}

function set(element: HTMLElement, selector: string, value: string) {
  const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('change'));
}

describe('BottlingForm', () => {
  it('plans two productions on the same day, the appellation taken from the tank', async () => {
    const { http, fixture, element } = setup();
    fixture.componentRef.setInput('day', '2026-11-23');
    fixture.detectChanges();
    await flushLists(http, fixture);

    // Le matin : le Japon, tiré de C12 (Bordeaux Supérieur 2023)
    set(element, '#bt-slot-0', 'MORNING');
    set(element, '#bt-product-0', 'jp');
    set(element, '#bt-bottles-0', '3000');
    set(element, '#bt-tank-0', 't12');
    fixture.detectChanges();
    expect(element.querySelector<HTMLSelectElement>('#bt-appellation-0')!.value).toBe('bxs');
    expect(element.querySelector<HTMLInputElement>('#bt-vintage-0')!.value).toBe('2023');
    expect(element.textContent).toContain('Lot LBXS23··');

    // L'après-midi : la production suivante reprend la cuve et le vin
    const add = [...element.querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Ajouter une production'),
    )!;
    add.click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLSelectElement>('#bt-slot-1')!.value).toBe('AFTERNOON');
    set(element, '#bt-product-1', 'fr');
    set(element, '#bt-bottles-1', '3000');
    fixture.detectChanges();
    expect(element.textContent).toContain('2 productions · 6,000 bouteilles');

    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    const request = http.expectOne({ method: 'POST', url: '/api/production/bottlings' });
    const body = request.request.body;
    expect(body.location).toBe('ON_SITE');
    expect(body.productions).toEqual([
      expect.objectContaining({
        id: null,
        startDate: '2026-11-23',
        endDate: null,
        slot: 'MORNING',
        finishedArticleId: 'jp',
        plannedBottles: 3000,
        sourceTankId: 't12',
        appellationId: 'bxs',
        vintage: 2023,
      }),
      expect.objectContaining({
        slot: 'AFTERNOON',
        finishedArticleId: 'fr',
        sourceTankId: 't12',
        appellationId: 'bxs',
        vintage: 2023,
      }),
    ]);
  });

  it('keeps the lot number of an existing production and shows the closed ones apart', async () => {
    const { http, fixture, element } = setup();
    fixture.componentRef.setInput(
      'bottling',
      aBottling({
        status: 'IN_PROGRESS',
        productions: [
          aProduction({
            id: 'done',
            status: 'CLOSED',
            producedBottles: 590,
            lotNumber: 'LCDB2201',
          }),
          aProduction({
            id: 'next',
            slot: 'AFTERNOON',
            lotNumber: 'LCDB2202',
            appellationId: 'bx',
            vintage: 2022,
          }),
        ],
      }),
    );
    fixture.detectChanges();
    await flushLists(http, fixture);

    const text = element.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Déjà faites ou annulées');
    expect(text).toContain('LCDB2201');
    expect(text).toContain('Lot LCDB2202');
    // Une seule production modifiable : celle de l'après-midi
    expect(element.querySelector('#bt-product-1')).toBeNull();

    // Changer le millésime : le numéro sera redonné à l'enregistrement
    set(element, '#bt-vintage-0', '2021');
    fixture.detectChanges();
    expect(element.textContent).toContain('Lot LBX21··');
  });
});
