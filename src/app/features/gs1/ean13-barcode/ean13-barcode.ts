import { Component, computed, input } from '@angular/core';

// Les motifs EAN-13 de chaque chiffre (1 = barre noire), selon le jeu de codage
const L = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];
const G = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];
const R = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];
/** Le premier chiffre n'est pas dessiné : il choisit, pour les 6 suivants, le jeu L ou G. */
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

const QUIET = 9; // la marge blanche à gauche, en modules (le 1er chiffre s'y écrit)
const HEIGHT = 60;
const GUARD_HEIGHT = 66;

/** Les 95 modules d'un EAN-13, et ceux qui appartiennent aux gardes (barres plus longues). */
export function ean13Modules(gtin: string): { bars: string; guards: Set<number> } {
  const digits = gtin.split('').map(Number);
  const parity = PARITY[digits[0]];
  let bars = '101';
  for (let i = 1; i <= 6; i++) {
    bars += (parity[i - 1] === 'L' ? L : G)[digits[i]];
  }
  bars += '01010';
  for (let i = 7; i <= 12; i++) {
    bars += R[digits[i]];
  }
  bars += '101';
  const guards = new Set<number>([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  return { bars, guards };
}

/**
 * Un code-barres EAN-13, dessiné en SVG à partir du gencode : de quoi le vérifier à l'œil,
 * ou le scanner sur l'écran avec une douchette. Les chiffres s'écrivent dessous, comme sur l'étiquette.
 */
@Component({
  selector: 'app-ean13-barcode',
  host: { class: 'inline-block' },
  template: `
    @if (shape(); as s) {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        [attr.viewBox]="'0 0 ' + s.width + ' ' + (digits() ? GUARD_HEIGHT + 10 : GUARD_HEIGHT)"
        class="h-full w-auto bg-white"
        role="img"
        [attr.aria-label]="'Code-barres EAN-13 ' + gtin()"
      >
        @for (bar of s.rects; track bar.x) {
          <rect
            [attr.x]="bar.x"
            y="0"
            [attr.width]="bar.width"
            [attr.height]="bar.guard ? GUARD_HEIGHT : HEIGHT"
            fill="#111"
          />
        }
        @if (digits()) {
          <g font-family="ui-monospace, monospace" font-size="9" fill="#111" text-anchor="middle">
            <text [attr.x]="QUIET / 2" [attr.y]="HEIGHT + 9">{{ gtin()[0] }}</text>
            @for (d of s.left; track $index) {
              <text [attr.x]="QUIET + 3 + $index * 7 + 3.5" [attr.y]="HEIGHT + 9">{{ d }}</text>
            }
            @for (d of s.right; track $index) {
              <text [attr.x]="QUIET + 50 + $index * 7 + 3.5" [attr.y]="HEIGHT + 9">{{ d }}</text>
            }
          </g>
        }
      </svg>
    } @else {
      <span class="text-xs text-muted-foreground">Gencode invalide</span>
    }
  `,
})
export class Ean13Barcode {
  readonly gtin = input.required<string>();
  /** Les chiffres sous les barres ; false pour un petit aperçu, où ils seraient illisibles. */
  readonly digits = input(true);

  protected readonly QUIET = QUIET;
  protected readonly HEIGHT = HEIGHT;
  protected readonly GUARD_HEIGHT = GUARD_HEIGHT;

  protected readonly shape = computed(() => {
    const gtin = this.gtin();
    if (!/^\d{13}$/.test(gtin)) {
      return null;
    }
    const { bars, guards } = ean13Modules(gtin);
    // Les modules noirs voisins ne font qu'un rectangle
    const rects: { x: number; width: number; guard: boolean }[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (bars[i] === '1') {
        const last = rects[rects.length - 1];
        if (last && last.x + last.width === QUIET + i && last.guard === guards.has(i)) {
          last.width++;
        } else {
          rects.push({ x: QUIET + i, width: 1, guard: guards.has(i) });
        }
      }
    }
    return {
      rects,
      width: QUIET + 95 + 7,
      left: gtin.slice(1, 7).split(''),
      right: gtin.slice(7).split(''),
    };
  });
}
