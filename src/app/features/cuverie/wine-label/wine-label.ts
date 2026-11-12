import { Component, computed, input } from '@angular/core';
import { describeWine, WINE_COLOR_LABELS, WineLotSummary } from '../cuverie.models';

/** La pastille de couleur du vin, reprise par la jauge des cuves. */
export const WINE_COLOR_CLASSES = {
  RED: 'bg-primary',
  WHITE: 'bg-amber-300',
  ROSE: 'bg-pink-400',
} as const;

/** "● Bordeaux Supérieur 2023 · V26-001" : un vin, partout où on l'affiche. */
@Component({
  selector: 'app-wine-label',
  template: `
    <span class="inline-flex min-w-0 items-center gap-2">
      <span aria-hidden="true" class="size-2.5 shrink-0 rounded-full" [class]="dotClass()"></span>
      <span class="sr-only">{{ colorLabel() }}</span>
      <span class="truncate font-medium">{{ title() }}</span>
      @if (showCode()) {
        <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ lot().code }}</span>
      }
    </span>
  `,
})
export class WineLabel {
  readonly lot =
    input.required<Pick<WineLotSummary, 'code' | 'appellation' | 'color' | 'vintage'>>();
  readonly showCode = input(true);

  protected readonly title = computed(() => describeWine(this.lot()));
  protected readonly dotClass = computed(() => WINE_COLOR_CLASSES[this.lot().color]);
  protected readonly colorLabel = computed(
    () => `Vin ${WINE_COLOR_LABELS[this.lot().color].toLowerCase()} :`,
  );
}
