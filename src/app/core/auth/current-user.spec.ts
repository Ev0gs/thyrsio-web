import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import Keycloak from 'keycloak-js';
import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  function setup(tokenParsed: Record<string, unknown>, roles: string[] = []) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(), // l'appel à /api/users/me ne part pas sur le réseau
        // Un faux Keycloak : juste ce que le service lit
        {
          provide: Keycloak,
          useValue: { tokenParsed, hasRealmRole: (role: string) => roles.includes(role) },
        },
      ],
    });
    return TestBed.inject(CurrentUser);
  }

  it('reads the name from the token and builds initials', () => {
    const user = setup({ name: 'Pierre Martin', email: 'pierre@example.com' });
    expect(user.name).toBe('Pierre Martin');
    expect(user.initials).toBe('PM');
    expect(user.email).toBe('pierre@example.com');
  });

  it('falls back to the login name when the token has no name', () => {
    const user = setup({ preferred_username: 'pmartin' });
    expect(user.name).toBe('pmartin');
    expect(user.initials).toBe('P');
  });

  it('detects the ADMIN role', () => {
    expect(setup({ name: 'A' }, ['ADMIN']).isAdmin).toBe(true);
  });
});
