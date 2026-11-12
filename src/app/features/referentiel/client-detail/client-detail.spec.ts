import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ClientDetail } from './client-detail';

describe('ClientDetail', () => {
  it('shows the client and separates active and archived addresses', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(ClientDetail);
    fixture.componentRef.setInput('id', 'c1');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/referentiel/clients/c1').flush({
      id: 'c1',
      code: 'TOKYO-WINE',
      name: 'Tokyo Wine Import KK',
      countryCode: 'JP',
      language: 'en',
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: 'Tokyo',
      email: null,
      phone: null,
      vatNumber: null,
      exciseNumber: null,
      defaultIncoterm: 'FOB',
      gs1LabelingRequired: true,
      notes: null,
      active: true,
      createdAt: '2026-11-01T10:00:00Z',
    });
    const address = {
      clientId: 'c1',
      recipientName: null,
      addressLine2: null,
      postalCode: null,
      countryCode: 'JP',
      phone: null,
      deliveryInstructions: null,
      createdAt: '2026-11-01T10:00:00Z',
    };
    http
      .expectOne((r) => r.url === '/api/referentiel/clients/c1/delivery-addresses')
      .flush([
        {
          ...address,
          id: 'a1',
          label: 'Entrepôt Yokohama',
          addressLine1: '1-2 Daikoku',
          city: 'Yokohama',
          defaultAddress: true,
          active: true,
        },
        {
          ...address,
          id: 'a2',
          label: 'Ancien entrepôt',
          addressLine1: '3-4 Nanko',
          city: 'Osaka',
          defaultAddress: false,
          active: false,
        },
      ]);

    await fixture.whenStable();
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Tokyo Wine Import KK');
    expect(text).toContain('Japon'); // le nom du pays, pas son code
    expect(text).toContain('Entrepôt Yokohama');
    expect(text).toContain('Par défaut');
    expect(text).toContain('Adresses archivées (1)');
    expect(text).not.toContain('Ancien entrepôt'); // replié par défaut
  });

  it('maps the located addresses and explains the others', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(ClientDetail);
    fixture.componentRef.setInput('id', 'c1');
    fixture.detectChanges();
    TestBed.tick();

    http.expectOne('/api/referentiel/clients/c1').flush({
      id: 'c1',
      code: 'CAVE',
      name: 'Cave Bordelaise',
      countryCode: 'FR',
      language: 'fr',
      addressLine1: '10 quai des Chartrons',
      postalCode: '33000',
      city: 'Bordeaux',
      active: true,
      location: { latitude: 44.85, longitude: -0.57, approximate: false },
      locationStatus: 'LOCATED',
    });
    const address = {
      clientId: 'c1',
      countryCode: 'FR',
      defaultAddress: false,
      active: true,
      location: null,
    };
    http
      .expectOne((r) => r.url === '/api/referentiel/clients/c1/delivery-addresses')
      .flush([
        {
          ...address,
          id: 'a1',
          label: 'Entrepôt neuf',
          addressLine1: '5 rue du Port',
          city: 'Lormont',
          locationStatus: 'PENDING',
        },
        {
          ...address,
          id: 'a2',
          label: 'Dépôt',
          addressLine1: '1 rue X',
          city: 'Nulle-Part',
          locationStatus: 'NOT_FOUND',
        },
      ]);

    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('app-location-map [role="img"]')?.getAttribute('aria-label')).toBe(
      'Carte : Siège',
    );
    expect(element.textContent).toContain('1 adresse(s) en cours de localisation');
    expect(element.textContent).toContain('Introuvable sur la carte : Dépôt');
    fixture.destroy(); // arrête le rechargement automatique
  });
});
