import { Component, computed, input } from '@angular/core';
import { WineColor } from '../../cuverie/cuverie.models';
import { WINE_SHADES } from '../../cuverie/tank-illustration/tank-illustration';

let nextId = 0;

/** Un verre à vin, rempli de la couleur du vin. */
@Component({
  selector: 'app-wine-glass-illustration',
  template: `
    <svg viewBox="0 0 80 150" class="h-full w-auto" role="img" [attr.aria-label]="ariaLabel()">
      <defs>
        <linearGradient [attr.id]="ids.wine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" [attr.stop-color]="shade().top" />
          <stop offset="1" [attr.stop-color]="shade().bottom" />
        </linearGradient>
        <clipPath [attr.id]="ids.clip">
          <path [attr.d]="bowlPath" />
        </clipPath>
      </defs>

      <!-- Le verre : le calice, la jambe, le pied -->
      <path [attr.d]="bowlPath" fill="#f4f6f8" fill-opacity="0.6" />
      <g [attr.clip-path]="'url(#' + ids.clip + ')'">
        <rect x="0" y="40" width="80" height="60" [attr.fill]="'url(#' + ids.wine + ')'" />
        <ellipse cx="40" cy="40" rx="27" ry="3.2" [attr.fill]="shade().top" />
        <ellipse cx="40" cy="40" rx="27" ry="3.2" fill="#fff" opacity="0.25" />
        <!-- Le reflet -->
        <path
          d="M19,14 Q15,40 22,62"
          fill="none"
          stroke="#fff"
          stroke-width="3"
          stroke-linecap="round"
          opacity="0.55"
        />
      </g>
      <path [attr.d]="bowlPath" fill="none" stroke="#9aa1a9" stroke-width="1.4" />
      <path d="M38,92 h4 v38 h-4 Z" fill="#e7eaee" stroke="#9aa1a9" stroke-width="1.2" />
      <ellipse cx="40" cy="134" rx="22" ry="5" fill="#eef0f3" stroke="#9aa1a9" stroke-width="1.4" />
    </svg>
  `,
  host: { class: 'inline-block' },
})
export class WineGlassIllustration {
  /** La couleur du vin ; par défaut un rouge. */
  readonly color = input<WineColor | null>(null);

  private readonly id = nextId++;
  protected readonly ids = { wine: `glass-wine-${this.id}`, clip: `glass-clip-${this.id}` };

  /** Un calice en tulipe, qui se resserre légèrement vers le haut. */
  protected readonly bowlPath =
    'M14,6 H66 C70,34 70,62 56,80 C50,88 44,92 40,92 C36,92 30,88 24,80 C10,62 10,34 14,6 Z';

  protected readonly shade = computed(() => WINE_SHADES[this.color() ?? 'RED']);
  protected readonly ariaLabel = computed(
    () =>
      ({ RED: 'Verre de vin rouge', WHITE: 'Verre de vin blanc', ROSE: 'Verre de vin rosé' })[
        this.color() ?? 'RED'
      ],
  );
}
