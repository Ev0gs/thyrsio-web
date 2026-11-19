import {
  checkDigit,
  describePackaging,
  formatGtin,
  isValidGtin,
  normalizeGtin,
} from './gs1.models';
import { ean13Modules } from './ean13-barcode/ean13-barcode';

describe('gs1.models', () => {
  it('computes the GS1 check digit, like the API', () => {
    expect(checkDigit('400638133393')).toBe(1);
    expect(checkDigit('376012345678')).toBe(4);
    expect(isValidGtin('4006381333931')).toBe(true);
    expect(isValidGtin('4006381333932')).toBe(false);
    expect(isValidGtin(normalizeGtin('4 006381 333931'))).toBe(true);
  });

  it('describes a packaging and formats a gtin as printed', () => {
    expect(describePackaging('BOTTLE', 1)).toBe('Bouteille');
    expect(describePackaging('WOODEN_CASE', 6)).toBe('Caisse bois de 6');
    expect(formatGtin('3760123456784')).toBe('3 760123 456784');
  });

  it('encodes an EAN-13 on 95 modules with its guards', () => {
    const { bars } = ean13Modules('4006381333931');
    expect(bars.length).toBe(95);
    expect(bars.startsWith('101')).toBe(true);
    expect(bars.slice(45, 50)).toBe('01010');
    expect(bars.endsWith('101')).toBe(true);
    // 1er chiffre 4 → jeux L G L L G G ; le 2e chiffre (0) en L : 0001101
    expect(bars.slice(3, 10)).toBe('0001101');
    // Le 3e chiffre (0) en G : 0100111
    expect(bars.slice(10, 17)).toBe('0100111');
  });
});
