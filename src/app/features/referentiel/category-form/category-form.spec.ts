import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryRow } from '../referentiel.models';
import { CategoryForm } from './category-form';

const units = [
  { id: 'u1', code: 'U', label: 'Unité', decimals: 0 },
  { id: 'u2', code: 'KG', label: 'Kilogramme', decimals: 3 },
];

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CategoryForm);
  return { http, fixture };
}

function type(element: HTMLElement, selector: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CategoryForm', () => {
  it('creates a category with its unit, without any lot tracking', async () => {
    const { http, fixture } = setup();
    let saved: CategoryRow | undefined;
    fixture.componentInstance.saved.subscribe((category) => (saved = category));
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/referentiel/units').flush(units);
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    type(element, '#cat-code', 'muselet');
    type(element, '#cat-label', 'Muselet');
    // Les matières sèches n'ont pas de lot : la seule case est « Réglementé »
    const checkboxes = element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBe(1);
    expect(element.textContent).not.toContain('Suivi par lot');
    checkboxes[0].click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('button:not([variant="outline"])')!.click();
    TestBed.tick();

    const request = http.expectOne({ method: 'POST', url: '/api/referentiel/categories' });
    expect(request.request.body).toEqual({
      code: 'muselet',
      label: 'Muselet',
      defaultUnitCode: 'U',
      regulated: true,
    });
    const created = {
      id: 'c9',
      code: 'MUSELET',
      label: 'Muselet',
      defaultUnitCode: 'U',
      regulated: true,
      active: true,
    };
    request.flush(created);
    await fixture.whenStable();

    expect(saved).toEqual(created);
  });

  it('keeps the code of an existing category', async () => {
    const { http, fixture } = setup();
    fixture.componentRef.setInput('category', {
      id: 'c1',
      code: 'BOUCHON',
      label: 'Bouchon',
      defaultUnitCode: 'U',
      regulated: false,
      active: true,
    });
    fixture.detectChanges();
    TestBed.tick();
    http.expectOne('/api/referentiel/units').flush(units);
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#cat-code')).toBeNull();
    expect(element.textContent).toContain('BOUCHON');
    expect(element.querySelector<HTMLInputElement>('#cat-label')!.value).toBe('Bouchon');
  });
});
