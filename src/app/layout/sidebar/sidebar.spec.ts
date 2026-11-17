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
    // Branche production : les ventes et les clients sont masqués, les fournisseurs restent
    expect(text).toContain('Mises en bouteille');
    expect(text).toContain('Fournisseurs');
    // Les registres et la fiche de l'entreprise
    expect(text).toContain('Cahier de chai');
    expect(text).toContain('Société');
    expect(text).not.toContain('Commandes clients');
    expect(text).not.toContain('Expéditions');
    expect(text).not.toContain('Clients');
    // L'icône est bien enregistrée : sans elle, le bouton de déconnexion est vide
    const logout: HTMLElement = fixture.nativeElement.querySelector(
      '[aria-label="Se déconnecter"]',
    );
    expect(logout.querySelector('svg')).not.toBeNull();
  });
});
