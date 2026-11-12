import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BottlingRow } from '../production.models';
import { BottlingPlanning } from './bottling-planning';

const row = (overrides: Partial<BottlingRow>): BottlingRow => ({
  id: 'b1',
  code: 'MB-26-001',
  status: 'PLANNED',
  location: 'ON_SITE',
  contractor: null,
  startDate: '2026-11-10',
  endDate: '2026-11-11',
  finishedArticleId: 'a1',
  finishedArticleCode: 'PF-CDB22-75',
  finishedArticleLabel: 'Côtes de Bourg 2022 · 75 cl',
  plannedBottles: 3600,
  producedBottles: null,
  bottleVolumeCl: 75,
  wineNeededHl: 27,
  sourceTankId: 't1',
  sourceTankCode: 'C11',
  wineLot: null,
  wineDescription: null,
  shortageCount: 2,
  alert: true,
  lotNumber: null,
  ...overrides,
});

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

    const page = {
      content: [row({})],
      page: { size: 200, number: 0, totalElements: 1, totalPages: 1 },
    };
    http.expectOne((request) => request.params.get('from') === '2026-11-09').flush(page);
    http.expectOne((request) => request.params.get('status') === 'PLANNED').flush(page);
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Semaine 46');
    expect(text).toContain('jour 1/2');
    expect(text).toContain('jour 2/2');
    expect(text).toContain('Cuve C11');
    expect(text).toContain('1 mise(s) dans les 10 prochains jours manquent de matières sèches');
  });
});
