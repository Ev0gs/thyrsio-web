/**
 * La position d'une adresse, calculée par l'API en tâche de fond (OpenStreetMap).
 * null tant que l'adresse n'a pas été localisée, ou si elle est introuvable.
 * approximate : seule la ville (ou le code postal) a été trouvée, pas la rue.
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  approximate: boolean;
}

/**
 * Où en est la localisation : LOCATED (trouvée), PENDING (en cours, quelques secondes),
 * NOT_FOUND (introuvable : ville ou code postal à vérifier), NO_ADDRESS (pas de ville).
 */
export type LocationStatus = 'LOCATED' | 'PENDING' | 'NOT_FOUND' | 'NO_ADDRESS';

/** Le lien vers OpenStreetMap, centré sur le point. */
export const openStreetMapUrl = (location: GeoLocation) =>
  `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}` +
  `#map=${location.approximate ? 13 : 17}/${location.latitude}/${location.longitude}`;

/** Le même point dans Google Maps (itinéraire, Street View). */
export const googleMapsUrl = (location: GeoLocation) =>
  `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
