import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GtinList } from './gtin-list';

const page = (content: unknown[]) => ({
  content,
  page: { size: 50, number: 0, totalElements: content.length, totalPages: 1 },
});

describe('GtinList', () => {
  it('asks for the GS1 prefix first, then lists gencodes with their packaging', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(GtinList);
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/gs1/prefixes').flush([]);
    const list = http.expectOne((r) => r.url === '/api/gs1/gtins');
    expect(list.request.params.get('status')).toBe('ACTIVE');
    list.flush(
      page([
        {
          id: 'g1',
          gtin: '3760123450014',
          prefixId: null,
          prefix: null,
          finishedArticleId: 'pf1',
          finishedArticleCode: 'PF-1',
          finishedArticleLabel: 'Bordeaux 2023 · 75 cl',
          packaging: 'WOODEN_CASE',
          packagingLabel: 'Caisse bois',
          unitsPerPack: 6,
          description: null,
          status: 'ACTIVE',
          notes: null,
          createdAt: '2026-11-19T09:00:00Z',
          assignedAt: null,
          retiredAt: null,
        },
        {
          id: 'g2',
          gtin: '4006381333931',
          prefixId: null,
          prefix: null,
          finishedArticleId: null,
          finishedArticleCode: null,
          finishedArticleLabel: null,
          packaging: 'BOTTLE',
          packagingLabel: 'Bouteille',
          unitsPerPack: 1,
          description: null,
          status: 'ACTIVE',
          notes: null,
          createdAt: '2026-11-19T09:00:00Z',
          assignedAt: null,
          retiredAt: null,
        },
      ]),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('ajoute le préfixe entreprise GS1');
    // Sans préfixe, on ne peut pas générer
    const generate = [...element.querySelectorAll('button')].find((b) =>
      b.textContent!.includes('Générer un gencode'),
    )!;
    expect(generate.disabled).toBe(true);

    const rows = [...element.querySelectorAll('tbody tr')] as HTMLElement[];
    expect(rows[0].textContent).toContain('3 760123 450014');
    expect(rows[0].textContent).toContain('Caisse bois de 6');
    expect(rows[0].querySelector('svg[role="img"]')).not.toBeNull();
    expect(rows[1].textContent).toContain('Réservé');
  });
});
