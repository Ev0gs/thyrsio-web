import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { fillPercent, TankState, WineColor } from '../cuverie.models';

/** Le vin dans la cuve : un dégradé, plus clair en surface, plus profond au fond, et un texte lisible dessus. */
const WINE_SHADES: Record<WineColor, { top: string; bottom: string; text: string }> = {
  RED: { top: '#a3284c', bottom: '#5a1027', text: '#ffffff' },
  WHITE: { top: '#f8e39a', bottom: '#e2b443', text: '#5c4310' },
  ROSE: { top: '#f8b3cb', bottom: '#df7099', text: '#5e1631' },
};

/** Ce qu'on écrit dans une cuve sans vin. */
const EMPTY_LABELS: Partial<Record<TankState, string>> = {
  EMPTY: 'Vide',
  CLEANING: 'En nettoyage',
  OUT_OF_SERVICE: 'Hors service',
};

// La géométrie, en unités du dessin (viewBox 0 0 190 260)
const INNER_TOP = 21; // le haut du dôme, côté intérieur : 100 %
const INNER_BOTTOM = 216; // le fond, côté intérieur : 0 %
const WAVE_LENGTH = 34;

/** Une surface ondulée, plus large que la cuve pour pouvoir glisser sans laisser de vide. */
function wavePath(): string {
  let path = `M-${WAVE_LENGTH * 2},0`;
  for (let x = -WAVE_LENGTH * 2; x < 200; x += WAVE_LENGTH) {
    path += ` q${WAVE_LENGTH / 4},-2.6 ${WAVE_LENGTH / 2},0 t${WAVE_LENGTH / 2},0`;
  }
  return `${path} L200,${INNER_BOTTOM} L-${WAVE_LENGTH * 2},${INNER_BOTTOM} Z`;
}
const WAVE = wavePath();

let nextId = 0;

/**
 * Une cuve inox dessinée, remplie à son niveau réel, de la couleur du vin.
 * Les graduations (25, 50, 75 %) se lisent sur le côté ; une cuve sans vin dit pourquoi (vide, nettoyage...).
 * Le niveau monte ou descend en douceur quand le volume change ; la surface ondule légèrement
 * (immobile si l'utilisateur a demandé moins d'animations).
 */
@Component({
  selector: 'app-tank-illustration',
  imports: [DecimalPipe],
  styles: `
    .wave {
      animation: tank-wave 4s linear infinite;
    }
    .level {
      transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes tank-wave {
      from {
        transform: translateX(0);
      }
      to {
        transform: translateX(${WAVE_LENGTH}px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .wave {
        animation: none;
      }
      .level {
        transition: none;
      }
    }
  `,
  template: `
    <svg
      viewBox="0 0 190 260"
      class="h-auto w-full"
      role="meter"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-valuenow]="volumeHl()"
      aria-valuemin="0"
      [attr.aria-valuemax]="capacityHl()"
    >
      <defs>
        <linearGradient [attr.id]="ids.steel" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#c9ced4" />
          <stop offset="0.28" stop-color="#f5f6f8" />
          <stop offset="0.62" stop-color="#d9dde2" />
          <stop offset="1" stop-color="#b4bac2" />
        </linearGradient>
        <linearGradient [attr.id]="ids.inside" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#e3e6ea" />
          <stop offset="0.5" stop-color="#f1f2f4" />
          <stop offset="1" stop-color="#dcdfe3" />
        </linearGradient>
        <linearGradient [attr.id]="ids.wine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" [attr.stop-color]="shade()?.top" />
          <stop offset="1" [attr.stop-color]="shade()?.bottom" />
        </linearGradient>
        <linearGradient [attr.id]="ids.shine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.18" />
          <stop offset="0.3" stop-color="#fff" stop-opacity="0.22" />
          <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
          <stop offset="1" stop-color="#000" stop-opacity="0.2" />
        </linearGradient>
        <clipPath [attr.id]="ids.clip">
          <path d="M29,42 Q29,23 80,21 Q131,23 131,42 L131,204 Q131,211 80,216 Q29,211 29,204 Z" />
        </clipPath>
      </defs>

      <!-- Les pieds et la vanne -->
      <g fill="#a9b0b8">
        <rect x="36" y="208" width="7" height="40" rx="1.5" />
        <rect x="117" y="208" width="7" height="40" rx="1.5" />
        <rect x="76.5" y="214" width="7" height="34" rx="1.5" />
        <rect x="31" y="246" width="17" height="4" rx="1" />
        <rect x="112" y="246" width="17" height="4" rx="1" />
        <rect x="71.5" y="246" width="17" height="4" rx="1" />
      </g>
      <rect x="133" y="192" width="12" height="7" rx="1.5" fill="#9aa1a9" />
      <circle cx="148" cy="195.5" r="5" fill="#b4bac2" stroke="#8a929b" stroke-width="1" />

      <!-- La cuve -->
      <path
        d="M25,40 Q25,17 80,15 Q135,17 135,40 L135,205 Q135,215 80,221 Q25,215 25,205 Z"
        [attr.fill]="'url(#' + ids.steel + ')'"
        stroke="#9aa1a9"
        stroke-width="1.5"
      />
      <!-- L'intérieur, vu en coupe, et le vin à son niveau -->
      <g [attr.clip-path]="'url(#' + ids.clip + ')'">
        <rect x="29" y="18" width="102" height="200" [attr.fill]="'url(#' + ids.inside + ')'" />
        @if (shade()) {
          <g class="level" [style.transform]="'translateY(' + levelY() + 'px)'">
            <g class="wave">
              <path [attr.d]="wave" [attr.fill]="'url(#' + ids.wine + ')'" />
              <path
                [attr.d]="wave"
                fill="none"
                stroke="#fff"
                stroke-opacity="0.35"
                stroke-width="1"
              />
            </g>
          </g>
        }
        <rect x="29" y="18" width="102" height="200" [attr.fill]="'url(#' + ids.shine + ')'" />
      </g>

      <!-- Le trou d'homme et les soudures -->
      <ellipse cx="80" cy="15.5" rx="15" ry="4" fill="#c3c8ce" stroke="#9aa1a9" stroke-width="1" />
      <g stroke="#9aa1a9" stroke-opacity="0.45" stroke-width="0.8">
        <line x1="25" y1="88" x2="135" y2="88" />
        <line x1="25" y1="148" x2="135" y2="148" />
      </g>

      <!-- Les graduations -->
      @for (mark of marks; track mark.percent) {
        <line
          [attr.x1]="137"
          [attr.x2]="143"
          [attr.y1]="mark.y"
          [attr.y2]="mark.y"
          stroke="#9aa1a9"
          stroke-width="1"
        />
        <text
          [attr.x]="146"
          [attr.y]="mark.y + 3"
          font-size="8.5"
          fill="currentColor"
          class="text-muted-foreground"
        >
          {{ mark.percent }} %
        </text>
      }

      @if (emptyLabel(); as label) {
        <text x="80" y="122" text-anchor="middle" font-size="12" font-weight="600" fill="#6b7280">
          {{ label }}
        </text>
      } @else {
        <!-- Le niveau, en pourcentage, sur la cuve -->
        <text
          x="80"
          [attr.y]="percentLabelY()"
          text-anchor="middle"
          font-size="15"
          font-weight="700"
          [attr.fill]="percentOnWine() ? shade()?.text : '#374151'"
          [attr.fill-opacity]="percentOnWine() ? 0.92 : 0.8"
        >
          {{ percent() | number: '1.0-0' }} %
        </text>
      }
    </svg>
  `,
})
export class TankIllustration {
  readonly volumeHl = input.required<number>();
  readonly capacityHl = input.required<number>();
  /** null : pas de vin, la cuve est dessinée vide. */
  readonly color = input<WineColor | null>(null);
  readonly state = input<TankState>('EMPTY');

  private readonly id = nextId++;
  /** Des identifiants propres à chaque dessin : plusieurs cuves peuvent cohabiter sur une page. */
  protected readonly ids = {
    steel: `tank-steel-${this.id}`,
    inside: `tank-inside-${this.id}`,
    wine: `tank-wine-${this.id}`,
    shine: `tank-shine-${this.id}`,
    clip: `tank-clip-${this.id}`,
  };
  protected readonly wave = WAVE;
  protected readonly marks = [25, 50, 75, 100].map((percent) => ({
    percent,
    y: INNER_BOTTOM - (percent / 100) * (INNER_BOTTOM - INNER_TOP),
  }));

  protected readonly percent = computed(() => fillPercent(this.volumeHl(), this.capacityHl()));
  protected readonly shade = computed(() => {
    const color = this.color();
    return color && this.volumeHl() > 0 ? WINE_SHADES[color] : null;
  });
  /** La hauteur de la surface du vin, dans le dessin. */
  protected readonly levelY = computed(
    () => INNER_BOTTOM - (this.percent() / 100) * (INNER_BOTTOM - INNER_TOP),
  );
  protected readonly emptyLabel = computed(() =>
    this.shade() ? null : (EMPTY_LABELS[this.state()] ?? 'Vide'),
  );
  /** Le pourcentage s'écrit dans le vin quand il y en a assez, au-dessus sinon. */
  protected readonly percentOnWine = computed(() => this.percent() >= 22);
  protected readonly percentLabelY = computed(() =>
    this.percentOnWine() ? Math.min(this.levelY() + 26, 200) : this.levelY() - 10,
  );
  protected readonly ariaLabel = computed(() =>
    this.shade()
      ? `Cuve remplie à ${Math.round(this.percent())} %`
      : `Cuve sans vin : ${this.emptyLabel()?.toLowerCase()}`,
  );
}
