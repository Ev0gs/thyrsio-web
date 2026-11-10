import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser } from '../../core/auth/current-user';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  it('greets the user by first name', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CurrentUser, useValue: { name: 'Pierre Martin' } },
      ],
    });

    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Bonjour Pierre');
  });
});
