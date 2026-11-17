import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompanySettings } from '../registre.models';
import { CompanySettingsPage } from './company-settings';

const empty: CompanySettings = {
  legalName: null,
  exciseNumber: null,
  siret: null,
  vatNumber: null,
  addressLine1: null,
  addressLine2: null,
  postalCode: null,
  city: null,
  countryCode: 'FR',
  phone: null,
  email: null,
  registerStartDate: null,
  updatedAt: '2026-11-01T00:00:00Z',
};

function type(element: HTMLElement, selector: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CompanySettingsPage', () => {
  it('saves the company sheet and shows the normalized excise number', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CompanySettingsPage);
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/company').flush(empty);
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    type(element, '#co-name', 'SARL Test');
    type(element, '#co-excise', 'fr 0109 26e2586');
    type(element, '#co-city', 'Saint-Émilion');
    type(element, '#co-start', '2027-01-01');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    TestBed.tick();

    const request = http.expectOne({ method: 'PUT', url: '/api/company' });
    expect(request.request.body).toEqual({
      ...empty,
      updatedAt: undefined,
      legalName: 'SARL Test',
      exciseNumber: 'fr 0109 26e2586',
      city: 'Saint-Émilion',
      registerStartDate: '2027-01-01',
    });
    request.flush({
      ...empty,
      legalName: 'SARL Test',
      exciseNumber: 'FR010926E2586',
      city: 'Saint-Émilion',
      registerStartDate: '2027-01-01',
      updatedAt: '2026-11-17T15:30:00Z',
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('#co-excise')!.value).toBe('FR010926E2586');
    expect(element.querySelector('[role="status"]')!.textContent).toContain('Enregistré');
  });
});
