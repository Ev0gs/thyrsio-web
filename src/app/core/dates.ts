/** La date du jour en heure locale, au format AAAA-MM-JJ (le format suédois est justement celui-là). */
export const todayLocal = (): string => new Date().toLocaleDateString('sv-SE');

/** "2026-11-01" → minuit (heure locale) ce jour-là, plus N jours, au format ISO attendu par l'API. */
export function startOfDay(day: string, plusDays = 0): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + plusDays);
  return date.toISOString();
}

/** Aujourd'hui (ou vide) : null, et l'API met l'heure exacte. Un autre jour : midi, heure locale. */
export function toInstant(day: string): string | null {
  return !day || day === todayLocal() ? null : new Date(`${day}T12:00:00`).toISOString();
}
