import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Bottling } from '../production.models';
import { CloseForm } from './close-form';

const bottling: Bottling = {
  id: 'b1',
  code: 'MB-26-001',
  status: 'PLANNED',
  location: 'AT_PRODUCER',
  contractor: 'Château Exemple',
  startDate: '2026-11-10',
  endDate: '2026-11-10',
  finishedArticleId: 'pf1',
  finishedArticleCode: 'PF-CDB22-75',
  finishedArticleLabel: 'Côtes de Bourg 2022 · 75 cl',
  plannedBottles: 3600,
  producedBottles: null,
  brokenBottles: null,
  bottleVolumeCl: 75,
  wineNeededHl: 27,
  wineUsedHl: null,
  sourceTankId: null,
  sourceTankCode: null,
  tankVolumeHl: null,
  wineLot: null,
  wineDescription: 'Côtes de Bourg rouge 2022',
  notes: null,
  shortageCount: 0,
  alert: false,
  lotNumber: null,
  allocations: [],
  materials: [
    {
      articleId: 'cork',
      articleCode: 'BCH-LIE-4924',
      articleLabel: 'Bouchon liège 49×24',
      categoryLabel: 'Bouchon',
      unitCode: 'U',
      plannedQuantity: 3600,
      stockQuantity: 3800,
      reservedBefore: 0,
      shortageQuantity: 0,
    },
  ],
  consumptions: [],
  closedAt: null,
  closedBy: null,
  createdBy: 'u1',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CloseForm);
  fixture.componentRef.setInput('bottling', bottling);
  fixture.detectChanges();
  return { http, fixture, element: fixture.nativeElement as HTMLElement };
}

function type(element: HTMLElement, selector: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CloseForm', () => {
  it('sends the dry goods consumed without any lot', async () => {
    const { http, fixture, element } = setup();

    // Ni choix de lot, ni chargement des lots en stock
    expect(element.querySelector('select')).toBeNull();
    expect(element.textContent).not.toContain('lot de');
    expect(element.textContent).toContain('en stock 3,800');
    http.expectNone((request) => request.url === '/api/stock/balances');

    type(element, '#cl-qty-0', '3610');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    const request = http.expectOne({ method: 'POST', url: '/api/production/bottlings/b1/close' });
    expect(request.request.body.consumptions).toEqual([{ articleId: 'cork', quantity: 3610 }]);
  });

  it('refuses more than the stock before calling the API', async () => {
    const { http, fixture, element } = setup();

    type(element, '#cl-qty-0', '4000');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain("Il n'y en a que 3800 U en stock");
    http.expectNone('/api/production/bottlings/b1/close');
  });
});
