import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { fillPercent, WineColor } from '../cuverie.models';
import { WINE_COLOR_CLASSES } from '../wine-label/wine-label';

/** La jauge d'une cuve : la barre prend la couleur du vin. */
@Component({
  selector: 'app-tank-gauge',
  imports: [DecimalPipe],
  template: `
    <div class="flex flex-col gap-1.5">
      <div class="flex items-baseline justify-between gap-2 text-sm">
        <span class="font-medium tabular-nums">
          {{ volumeHl() | number: '1.0-2' }}
          <span class="font-normal text-muted-foreground"
            >/ {{ capacityHl() | number: '1.0-2' }} hl</span
          >
        </span>
        <span class="text-xs tabular-nums text-muted-foreground"
          >{{ percent() | number: '1.0-0' }} %</span
        >
      </div>
      <div
        class="overflow-hidden rounded-full bg-muted"
        [class]="large() ? 'h-3' : 'h-2'"
        role="meter"
        aria-label="Remplissage de la cuve"
        [attr.aria-valuenow]="volumeHl()"
        aria-valuemin="0"
        [attr.aria-valuemax]="capacityHl()"
      >
        <div
          class="h-full rounded-full transition-[width]"
          [class]="barClass()"
          [style.width.%]="percent()"
        ></div>
      </div>
    </div>
  `,
})
export class TankGauge {
  readonly volumeHl = input.required<number>();
  readonly capacityHl = input.required<number>();
  /** null : cuve vide, la barre reste grise. */
  readonly color = input<WineColor | null>(null);
  readonly large = input(false);

  protected readonly percent = computed(() => fillPercent(this.volumeHl(), this.capacityHl()));
  protected readonly barClass = computed(() => {
    const color = this.color();
    return color ? WINE_COLOR_CLASSES[color] : 'bg-muted-foreground/30';
  });
}
