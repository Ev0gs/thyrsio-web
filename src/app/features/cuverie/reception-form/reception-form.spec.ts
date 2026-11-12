import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Tank } from '../cuverie.models';
import { ReceptionForm } from './reception-form';

const tank = (overrides: Partial<Tank>): Tank => ({
  id: 'id',
  code: 'C01',
  label: null,
  capacityHl: 100,
  volumeHl: 0,
  freeSpaceHl: 100,
  status: 'IN_SERVICE',
  state: 'EMPTY',
  wineLot: null,
  active: true,
  updatedAt: '2026-11-01T08:00:00Z',
  ...overrides,
});

describe('ReceptionForm', () => {
  it('only offers empty tanks in service', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ReceptionForm);
    fixture.componentRef.setInput('tanks', [
      tank({ id: 'empty', code: 'C01' }),
      tank({ id: 'full', code: 'C02', volumeHl: 50, freeSpaceHl: 50, state: 'IN_USE' }),
      tank({ id: 'cleaning', code: 'C03', status: 'CLEANING', state: 'CLEANING' }),
    ]);
    fixture.detectChanges();

    const options = [...fixture.nativeElement.querySelectorAll('#rc-tank-0 option')].map(
      (option: HTMLOptionElement) => option.value,
    );
    expect(options).toEqual(['', 'empty']);
  });
});
