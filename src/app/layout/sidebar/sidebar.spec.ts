import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser } from '../../core/auth/current-user';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  it('shows the navigation and the connected user', async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        // Un faux utilisateur : le vrai service demanderait Keycloak
        {
          provide: CurrentUser,
          useValue: { name: 'Pierre Martin', initials: 'PM', isAdmin: true },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Matières sèches');
    expect(text).toContain('Pierre Martin');
    expect(text).toContain('Administrateur');
  });
});
