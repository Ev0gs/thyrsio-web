import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import Keycloak from 'keycloak-js';

/** Le profil Thyrsio renvoyé par GET /api/users/me (UserResponse côté API). */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * L'utilisateur connecté. Le reste de l'application passe par ce service,
 * jamais directement par Keycloak.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly keycloak = inject(Keycloak);

  /**
   * Premier appel à l'API : crée ou met à jour le profil Thyrsio à partir du token.
   * httpResource lance la requête tout seul et expose value(), isLoading(), error() en signaux.
   */
  readonly profile = httpResource<UserProfile>(() => '/api/users/me');

  /** Avec login-required, quand l'application tourne, l'utilisateur est forcément connecté. */
  get name(): string {
    const token = this.keycloak.tokenParsed;
    return (
      this.profile.value()?.name ??
      (token?.['name'] as string | undefined) ??
      (token?.['preferred_username'] as string | undefined) ??
      ''
    );
  }

  get email(): string {
    return (this.keycloak.tokenParsed?.['email'] as string | undefined) ?? '';
  }

  /** "Pierre Martin" → "PM" */
  get initials(): string {
    const letters = this.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase());
    return letters.join('') || '?';
  }

  get isAdmin(): boolean {
    return this.keycloak.hasRealmRole('ADMIN');
  }

  /** Ferme la session Keycloak, puis revient sur l'application (donc sur la page de connexion). */
  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: window.location.origin });
  }

  /** La page "Mon compte" de Keycloak : mot de passe, e-mail, sessions ouvertes. */
  manageAccount(): Promise<void> {
    return this.keycloak.accountManagement();
  }
}
