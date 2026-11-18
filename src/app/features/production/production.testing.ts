import { Bottling, Production } from './production.models';

/** Une production de test : 3 600 bt de Côtes de Bourg 2022, cuve C11, lot LCDB2201. */
export function aProduction(overrides: Partial<Production> = {}): Production {
  return {
    id: 'p1',
    status: 'PLANNED',
    startDate: '2026-11-10',
    endDate: '2026-11-10',
    slot: 'FULL_DAY',
    finishedArticleId: 'a1',
    finishedArticleCode: 'PF-CDB22-75',
    finishedArticleLabel: 'Côtes de Bourg 2022 · 75 cl',
    plannedBottles: 3600,
    bottleVolumeCl: 75,
    wineNeededHl: 27,
    sourceTankId: 't1',
    sourceTankCode: 'C11',
    tankVolumeHl: 100,
    wineLot: null,
    wineDescription: null,
    appellationId: 'ap1',
    appellationCode: 'CDB',
    appellationName: 'Côtes de Bourg',
    vintage: 2022,
    lotNumber: 'LCDB2201',
    materials: [],
    allocations: [],
    shortageCount: 0,
    alert: false,
    producedBottles: null,
    brokenBottles: null,
    wineUsedHl: null,
    consumptions: [],
    closedAt: null,
    closedBy: null,
    ...overrides,
  };
}

/** Une mise de test, avec ses productions (une seule par défaut). */
export function aBottling(overrides: Partial<Bottling> = {}): Bottling {
  const productions = overrides.productions ?? [aProduction()];
  return {
    id: 'b1',
    code: 'MB-26-001',
    status: 'PLANNED',
    location: 'ON_SITE',
    contractor: 'Embouteillage Mobile Gironde',
    startDate: productions[0].startDate,
    endDate: productions[productions.length - 1].endDate,
    notes: null,
    plannedBottles: productions.reduce((sum, p) => sum + p.plannedBottles, 0),
    producedBottles: 0,
    shortageCount: productions.reduce((sum, p) => sum + p.shortageCount, 0),
    alert: productions.some((p) => p.alert),
    productions,
    createdBy: 'u1',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}
