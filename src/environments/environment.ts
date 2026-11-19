/**
 * La configuration de production. L'adresse de Keycloak est fixée à la compilation :
 *   ng build --define "THYRSIO_KEYCLOAK_URL='https://auth.mondomaine.fr'"
 * (c'est ce que fait le Dockerfile). Sans elle, on retombe sur le Keycloak local.
 */
declare const THYRSIO_KEYCLOAK_URL: string;

export const environment = {
  keycloak: {
    url: typeof THYRSIO_KEYCLOAK_URL !== 'undefined' ? THYRSIO_KEYCLOAK_URL : 'http://localhost:8180',
    realm: 'thyrsio',
    clientId: 'thyrsio-web',
  },
};
