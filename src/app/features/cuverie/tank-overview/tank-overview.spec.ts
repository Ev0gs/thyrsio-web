import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Tank } from '../cuverie.models';
import { TankOverview } from './tank-overview';

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

describe('TankOverview', () => {
  it('shows every tank with its wine and the total volume', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(TankOverview);
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/cuverie/tanks').flush([
      tank({
        id: 'a',
        code: 'C12',
        capacityHl: 200,
        volumeHl: 98.6,
        freeSpaceHl: 101.4,
        state: 'IN_USE',
        wineLot: {
          id: 'l1',
          code: 'V26-001',
          appellation: 'Bordeaux Supérieur',
          color: 'RED',
          vintage: 2023,
        },
      }),
      tank({ id: 'b', code: 'C03' }),
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('C12');
    expect(text).toContain('Bordeaux Supérieur 2023');
    expect(text).toContain('C03');
    expect(text).toContain('Prête à recevoir du vin');
    expect(text).toContain('/ 200 hl');
  });
});
