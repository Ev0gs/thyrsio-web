import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SupplierList } from './supplier-list';

const supplier = {
  id: 's1',
  name: 'Vignobles Marsac & Fils',
  kind: 'WINE',
  active: true,
  email: null,
  phone: null,
  address: '2 chemin des Palus, 33710 Bourg',
  averageLeadTimeDays: 5,
  createdAt: '2026-11-01T10:00:00Z',
  location: { latitude: 45.04, longitude: -0.56, approximate: false },
  locationStatus: 'LOCATED',
};

async function render(vue: string | undefined) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(SupplierList);
  if (vue) fixture.componentRef.setInput('vue', vue);
  fixture.detectChanges();
  TestBed.tick();
  const request = http.expectOne((r) => r.url === '/api/referentiel/suppliers');
  request.flush({
    content: [
      supplier,
      { ...supplier, id: 's2', name: 'Sans adresse', address: null, location: null },
    ],
    page: { size: 25, number: 0, totalElements: 2, totalPages: 1 },
  });
  await fixture.whenStable();
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, request };
}

describe('SupplierList', () => {
  it('shows the table by default, without a map', async () => {
    const { element, request } = await render(undefined);

    expect(request.request.params.get('size')).toBe('25');
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.querySelector('app-location-map')).toBeNull();
  });

  it('shows every supplier on a map in the map view', async () => {
    const { element, request } = await render('carte');

    expect(request.request.params.get('size')).toBe('1000');
    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('app-location-map [role="img"]')?.getAttribute('aria-label')).toBe(
      'Carte : Vignobles Marsac & Fils',
    );
    expect(element.textContent).toContain('1 sur 2 placés sur la carte');
  });
});
