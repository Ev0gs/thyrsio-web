import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CategoryList } from './category-list';

describe('CategoryList', () => {
  it('lists the categories with their unit and lot tracking', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CategoryList);
    fixture.detectChanges();
    TestBed.tick();

    const request = http.expectOne((r) => r.url === '/api/referentiel/categories');
    expect(request.request.params.get('includeArchived')).toBe('false');
    request.flush([
      {
        id: 'c1',
        code: 'CAPSULE_CRD',
        label: 'Capsule CRD',
        defaultUnitCode: 'U',
        lotTracked: true,
        regulated: true,
        active: true,
      },
      {
        id: 'c2',
        code: 'BOUTEILLE',
        label: 'Bouteille',
        defaultUnitCode: 'U',
        lotTracked: false,
        regulated: false,
        active: true,
      },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = [...fixture.nativeElement.querySelectorAll('tbody tr')] as HTMLElement[];
    expect(rows.map((row) => row.textContent!.replace(/\s+/g, ' ').trim())[0]).toContain(
      'Bouteille',
    );
    expect(rows[1].textContent).toContain('CAPSULE_CRD');
    expect(rows[1].textContent).toContain('Oui');
  });
});
