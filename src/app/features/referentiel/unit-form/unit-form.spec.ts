import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UnitForm } from './unit-form';

function type(element: HTMLElement, selector: string, value: string) {
  const input = element.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('UnitForm', () => {
  it('creates a unit with its precision', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(UnitForm);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    type(element, '#unit-code', 'cl');
    type(element, '#unit-label', 'Centilitre');
    type(element, '#unit-decimals', '1');
    fixture.detectChanges();
    expect(element.textContent).toContain('12,5 CL');

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    TestBed.tick();
    const request = http.expectOne({ method: 'POST', url: '/api/referentiel/units' });
    expect(request.request.body).toEqual({ code: 'cl', label: 'Centilitre', decimals: 1 });
    request.flush({ id: 'u9', code: 'CL', label: 'Centilitre', decimals: 1 });
    await fixture.whenStable();
  });

  it('only lets an existing unit be renamed', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(UnitForm);
    fixture.componentRef.setInput('unit', {
      id: 'u1',
      code: 'KG',
      label: 'Kilogramme',
      decimals: 3,
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#unit-code')).toBeNull();
    expect(element.querySelector('#unit-decimals')).toBeNull();
    expect(element.textContent).toContain('3 décimale(s)');
  });
});
