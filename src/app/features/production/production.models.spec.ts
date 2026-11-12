import { addDays, displayState, isoWeekNumber, mondayOf, wineNeededHl } from './production.models';

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
  });
});
