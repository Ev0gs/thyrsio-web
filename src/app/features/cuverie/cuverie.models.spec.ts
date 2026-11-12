import { describeWine, fillPercent, roundHl } from './cuverie.models';

describe('cuverie.models', () => {
  it('computes the fill rate of a tank, capped between 0 and 100', () => {
    expect(fillPercent(50, 200)).toBe(25);
    expect(fillPercent(0, 200)).toBe(0);
    expect(fillPercent(250, 200)).toBe(100);
    expect(fillPercent(10, 0)).toBe(0);
  });

  it('describes a wine with or without vintage', () => {
    expect(describeWine({ appellation: 'Bordeaux Supérieur', vintage: 2023 })).toBe(
      'Bordeaux Supérieur 2023',
    );
    expect(describeWine({ appellation: 'Bordeaux', vintage: null })).toBe('Bordeaux');
  });

  it('rounds volumes to the litre', () => {
    expect(roundHl(19.6 - 0.000000001)).toBe(19.6);
    expect(roundHl(0.1 + 0.2)).toBe(0.3);
  });
});
