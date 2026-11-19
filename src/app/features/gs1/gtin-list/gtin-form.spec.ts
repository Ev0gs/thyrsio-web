import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GtinForm } from './gtin-form';

const prefix = {
  id: 'px1',
  prefix: '376012345',
  label: null,
  active: true,
  capacity: 1000,
  used: 3,
  remaining: 997,
};
const products = [
  { articleId: 'pf1', articleCode: 'PF-1', articleLabel: 'Bordeaux 2023 · 75 cl', active: true },
];

async function setup(mode: 'generate' | 'record') {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(GtinForm);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('prefixes', [prefix]);
  fixture.detectChanges();
  TestBed.tick();
  http.expectOne((r) => r.url === '/api/stock/overview').flush(products);
  await fixture.whenStable();
  fixture.detectChanges();
  return { http, fixture, element: fixture.nativeElement as HTMLElement };
}

function set(element: HTMLElement, selector: string, value: string) {
  const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  field.value = value;
  field.dispatchEvent(new Event('input'));
  field.dispatchEvent(new Event('change'));
}

describe('GtinForm', () => {
  it('generates a carton of 6 for a finished good', async () => {
    const { http, fixture, element } = await setup('generate');
    set(element, '#gt-product', 'pf1');
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent!.trim() === 'Carton')!
      .click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#gt-units')!.value).toBe('6');

    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    const request = http.expectOne({ method: 'POST', url: '/api/gs1/gtins/generate' });
    expect(request.request.body).toEqual({
      prefixId: 'px1',
      finishedArticleId: 'pf1',
      packaging: 'CARTON',
      unitsPerPack: 6,
      description: null,
      notes: null,
    });
  });

  it('tells which check digit an existing gtin should end with', async () => {
    const { http, fixture, element } = await setup('record');
    set(element, '#gt-gtin', '4 006381 333932');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).toContain('le dernier chiffre devrait être 1');
    http.expectNone('/api/gs1/gtins');

    // Corrigé : enregistré sans produit (réservé)
    set(element, '#gt-gtin', '4 006381 333931');
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    const request = http.expectOne({ method: 'POST', url: '/api/gs1/gtins' });
    expect(request.request.body).toEqual(
      expect.objectContaining({
        gtin: '4006381333931',
        finishedArticleId: null,
        packaging: 'BOTTLE',
      }),
    );
  });
});
