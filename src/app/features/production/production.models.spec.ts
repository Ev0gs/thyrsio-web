import {
  addDays,
  bottlingHeading,
  bottlingTitle,
  displayState,
  isoWeekNumber,
  lotPrefix,
  matchAppellation,
  mondayOf,
  wineNeededHl,
} from './production.models';
import { aBottling, aProduction } from './production.testing';

describe('production.models', () => {
  it('finds the monday of any day of the week', () => {
    expect(mondayOf('2026-11-12')).toBe('2026-11-09'); // jeudi
    expect(mondayOf('2026-11-09')).toBe('2026-11-09'); // lundi
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // dimanche
  });

  it('adds days across months', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-11-09', -7)).toBe('2026-11-02');
  });

  it('computes the ISO week number', () => {
    expect(isoWeekNumber('2026-11-12')).toBe(46);
    expect(isoWeekNumber('2027-01-01')).toBe(53); // le vendredi 1er janvier 2027 appartient à la semaine 53 de 2026
  });

  it('computes the wine needed from bottles', () => {
    expect(wineNeededHl(6000, 75)).toBe(45);
    expect(wineNeededHl(1200, 150)).toBe(18);
  });

  it('tells a ready bottling from one that lacks materials', () => {
    expect(displayState({ status: 'PLANNED', shortageCount: 0 })).toBe('READY');
    expect(displayState({ status: 'PLANNED', shortageCount: 2 })).toBe('SHORT');
    expect(displayState({ status: 'CLOSED', shortageCount: 0 })).toBe('CLOSED');
    expect(displayState({ status: 'IN_PROGRESS', shortageCount: 0 })).toBe('IN_PROGRESS');
  });

  it('builds the start of a lot number from the appellation and the vintage', () => {
    expect(lotPrefix('BX', 2024)).toBe('LBX24');
    expect(lotPrefix('CDB', 2005)).toBe('LCDB05');
    expect(lotPrefix('BX', null)).toBe('LBXNM');
  });

  it('finds the appellation of a wine in a tank', () => {
    const appellations = [
      { id: 'bx', code: 'BX', name: 'Bordeaux', active: true },
      { id: 'bxs', code: 'BXS', name: 'Bordeaux Supérieur', active: true },
      { id: 'cdb', code: 'CDB', name: 'Côtes de Bourg', active: true },
    ];
    expect(matchAppellation('Bordeaux Supérieur', appellations)?.id).toBe('bxs');
    expect(matchAppellation('Bordeaux Blanc', appellations)?.id).toBe('bx');
    expect(matchAppellation('cotes de bourg', appellations)?.id).toBe('cdb');
    expect(matchAppellation('Saint-Émilion', appellations)).toBeNull();
  });

  it('names a bottling after its products', () => {
    expect(bottlingTitle(aBottling())).toBe('Côtes de Bourg 2022 · 75 cl');
    const two = aBottling({
      productions: [
        aProduction(),
        aProduction({ id: 'p2', finishedArticleLabel: 'Bordeaux 2023' }),
      ],
    });
    expect(bottlingTitle(two)).toBe('Côtes de Bourg 2022 · 75 cl + Bordeaux 2023');
    expect(bottlingHeading(two)).toBe('2 productions dans la journée');
    expect(bottlingHeading(aBottling())).toBe('Côtes de Bourg 2022 · 75 cl');
  });
});
