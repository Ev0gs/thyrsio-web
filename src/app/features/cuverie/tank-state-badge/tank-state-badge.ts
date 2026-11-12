import { Component, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { TANK_STATE_LABELS, TankState } from '../cuverie.models';

/** Le badge d'état d'une cuve : vue des cuves, fiche d'une cuve, tableau de bord. */
@Component({
  selector: 'app-tank-state-badge',
  imports: [HlmBadgeImports],
  template: `
    <span hlmBadge variant="secondary" [class]="classes[state()]">{{ labels[state()] }}</span>
  `,
})
export class TankStateBadge {
  readonly state = input.required<TankState>();

  protected readonly labels = TANK_STATE_LABELS;
  protected readonly classes: Record<TankState, string> = {
    IN_USE: 'bg-primary/10 text-primary',
    EMPTY: 'bg-emerald-50 text-emerald-700',
    CLEANING: 'bg-sky-50 text-sky-700',
    OUT_OF_SERVICE: 'bg-muted text-muted-foreground',
  };
}
