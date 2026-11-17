import { Component, computed, input } from '@angular/core';
import { WineColor } from '../../cuverie/cuverie.models';
import { WINE_SHADES } from '../../cuverie/tank-illustration/tank-illustration';

let nextId = 0;

/**
 * Une bouteille bordelaise : verre teinté, vin visible par transparence, capsule et étiquette
 * portant la contenance. Le verre est vert foncé pour un rouge, clair pour un blanc ou un rosé,
 * comme dans le chai.
 */
@Component({
  selector: 'app-bottle-illustration',
  template: `
    <svg viewBox="0 0 64 170" class="h-full w-auto" role="img" [attr.aria-label]="ariaLabel()">
      <defs>
        <linearGradient [attr.id]="ids.glass" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" [attr.stop-color]="glass().edge" />
          <stop offset="0.35" [attr.stop-color]="glass().middle" />
          <stop offset="1" [attr.stop-color]="glass().edge" />
        </linearGradient>
        <linearGradient [attr.id]="ids.wine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" [attr.stop-color]="shade().top" />
          <stop offset="1" [attr.stop-color]="shade().bottom" />
        </linearGradient>
        <clipPath [attr.id]="ids.clip">
          <path [attr.d]="bottlePath" />
        </clipPath>
      </defs>

      <!-- Le verre, puis le vin vu au travers, jusqu'au bas du goulot -->
      <path [attr.d]="bottlePath" [attr.fill]="'url(#' + ids.glass + ')'" />
      <g [attr.clip-path]="'url(#' + ids.clip + ')'">
        <rect
          x="0"
          y="52"
          width="64"
          height="120"
          [attr.fill]="'url(#' + ids.wine + ')'"
          [attr.opacity]="glass().wineOpacity"
        />
        <!-- Le reflet de la lumière sur le verre -->
        <rect x="16" y="40" width="5" height="120" rx="2.5" fill="#fff" opacity="0.28" />
      </g>
      <path [attr.d]="bottlePath" fill="none" [attr.stroke]="glass().outline" stroke-width="1.2" />

      <!-- La capsule -->
      <path
        d="M24.5,3 h15 a1.5,1.5 0 0 1 1.5,1.5 V34 h-18 V4.5 a1.5,1.5 0 0 1 1.5,-1.5 Z"
        fill="#7f1d3a"
      />
      <rect x="23" y="31" width="18" height="3" fill="#000" opacity="0.15" />

      <!-- L'étiquette -->
      <rect
        x="9"
        y="98"
        width="46"
        height="40"
        rx="2"
        fill="#fbf7ef"
        stroke="#e5dccb"
        stroke-width="0.8"
      />
      <line x1="16" x2="48" y1="108" y2="108" stroke="#7f1d3a" stroke-width="1.2" />
      <text x="32" y="124" text-anchor="middle" font-size="10" font-weight="700" fill="#3f3f46">
        {{ volumeCl() }} cl
      </text>
      <line x1="20" x2="44" y1="130" y2="130" stroke="#d6cfc0" stroke-width="1" />
    </svg>
  `,
  host: { class: 'inline-block' },
})
export class BottleIllustration {
  readonly volumeCl = input(75);
  /** La couleur du vin ; par défaut un rouge. */
  readonly color = input<WineColor | null>(null);

  private readonly id = nextId++;
  protected readonly ids = {
    glass: `bottle-glass-${this.id}`,
    wine: `bottle-wine-${this.id}`,
    clip: `bottle-clip-${this.id}`,
  };

  /** Goulot, épaules marquées, corps droit, fond arrondi : la bordelaise. */
  protected readonly bottlePath =
    'M25,4 H39 V44 C39,54 55,58 55,70 V158 Q55,166 47,166 H17 Q9,166 9,158 V70 C9,58 25,54 25,44 Z';

  protected readonly shade = computed(() => WINE_SHADES[this.color() ?? 'RED']);
  protected readonly glass = computed(() =>
    (this.color() ?? 'RED') === 'RED'
      ? { edge: '#14281c', middle: '#2c5138', outline: '#0f1f15', wineOpacity: 0.55 }
      : { edge: '#c9d6c2', middle: '#eef3ea', outline: '#a9b7a1', wineOpacity: 0.85 },
  );
  protected readonly ariaLabel = computed(() => `Bouteille de ${this.volumeCl()} cl`);
}
