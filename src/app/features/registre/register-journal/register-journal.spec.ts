import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RegisterEntry } from '../registre.models';
import { RegisterJournal } from './register-journal';

const reception: RegisterEntry = {
  id: 'e1',
  sequenceNo: 1,
  book: 'ENTREES_VRAC',
  bookLabel: 'Entrées de vin en vrac',
  kind: 'RECEPTION',
  operationAt: '2026-11-02T08:00:00Z',
  recordedAt: '2026-11-02T08:05:00Z',
  recordedByName: 'Pierre Martin',
  wineLotId: 'l1',
  wineLotCode: 'V26-001',
  denomination: 'Bordeaux Supérieur rouge 2023',
  tanks: 'C1',
  volumeHl: 75,
  reference: '24FRG92622010',
  summary: 'Entrée de 75 hl de Bordeaux Supérieur rouge 2023 en C1',
  data: { dae: '24FRG92622010', fills: [{ tank: 'C1', volumeHl: 75 }], color: 'RED' },
  correctsEntryId: null,
  late: false,
  hash: 'a'.repeat(64),
};

const correction: RegisterEntry = {
  ...reception,
  id: 'e2',
  sequenceNo: 2,
  kind: 'CORRECTION',
  recordedAt: '2026-11-06T10:00:00Z',
  summary: 'Correction du lot V26-001 : Bordeaux Supérieur rouge 2023 devient Bordeaux rouge 2023',
  data: { changes: { appellation: { before: 'Bordeaux Supérieur', after: 'Bordeaux' } } },
  correctsEntryId: 'e1',
  late: true,
  hash: 'b'.repeat(64),
};

async function setup(inputs: Record<string, string> = {}) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(RegisterJournal);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  TestBed.tick();
  return { http, fixture };
}

describe('RegisterJournal', () => {
  it('lists the entries with their number, late flag and correction link', async () => {
    const { http, fixture } = await setup();

    http.expectOne('/api/registre/verify').flush({
      valid: true,
      verifiedEntries: 2,
      brokenAt: null,
      problem: null,
      lastHash: 'b'.repeat(64),
    });
    http
      .expectOne((r) => r.url === '/api/registre/entries')
      .flush({
        content: [correction, reception],
        page: { size: 50, number: 0, totalElements: 2, totalPages: 1 },
      });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Registre intact');
    const rows = [...element.querySelectorAll('tbody tr')] as HTMLElement[];
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Contre-écriture');
    expect(rows[0].textContent).toContain("Corrige l'écriture n° 1");
    expect(rows[0].textContent).toContain('Hors délai');
    expect(rows[1].textContent).toContain('Réception');
    expect(rows[1].textContent).toContain('Pierre Martin');
    expect(rows[1].textContent).not.toContain('Hors délai');

    // Le détail d'une écriture : ses colonnes, lisibles, et son empreinte
    rows[1].querySelector<HTMLButtonElement>('button[aria-expanded]')!.click();
    fixture.detectChanges();
    const detail = element.querySelectorAll('tbody tr')[2] as HTMLElement;
    expect(detail.textContent).toContain('DAE / DSA');
    expect(detail.textContent).toContain('C1 : 75 hl');
    expect(detail.textContent).toContain('Rouge');
    expect(detail.textContent).toContain('a'.repeat(64));
  });

  it('sends the filters to the API and warns when the chain is broken', async () => {
    const { http, fixture } = await setup({
      registre: 'MOUVEMENTS',
      q: 'C1',
      retard: '1',
      lot: 'l1',
    });

    http.expectOne('/api/registre/verify').flush({
      valid: false,
      verifiedEntries: 4,
      brokenAt: 5,
      problem: "l'empreinte ne correspond plus au contenu",
      lastHash: null,
    });
    const request = http.expectOne((r) => r.url === '/api/registre/entries');
    expect(request.request.params.get('book')).toBe('MOUVEMENTS');
    expect(request.request.params.get('q')).toBe('C1');
    expect(request.request.params.get('late')).toBe('true');
    expect(request.request.params.get('wineLotId')).toBe('l1');
    request.flush({ content: [], page: { size: 50, number: 0, totalElements: 0, totalPages: 0 } });
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      "Registre altéré à l'écriture n° 5",
    );
    expect(element.textContent).toContain('Aucune écriture ne correspond à ces filtres.');
  });
});
