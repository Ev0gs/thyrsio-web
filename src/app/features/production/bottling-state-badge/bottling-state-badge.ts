import { Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { BottlingDisplayState, BottlingRow, displayState } from '../production.models';

const LABELS: Record<BottlingDisplayState, string> = {
  READY: 'Prête',
  SHORT: 'Manquants',
  CLOSED: 'Clôturée',
  CANCELLED: 'Annulée',
};

const CLASSES: Record<BottlingDisplayState, string> = {
  READY: 'bg-emerald-50 text-emerald-700',
  SHORT: 'bg-red-50 text-red-700',
  CLOSED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
};

/** L'état d'une mise : prête, en manque de matières, clôturée ou annulée. */
@Component({
  selector: 'app-bottling-state-badge',
  imports: [HlmBadgeImports],
  template: `<span hlmBadge variant="secondary" [class]="classes()">{{ label() }}</span>`,
})
export class BottlingStateBadge {
  readonly bottling = input.required<Pick<BottlingRow, 'status' | 'shortageCount'>>();

  private readonly state = computed(() => displayState(this.bottling()));
  protected readonly label = computed(() => LABELS[this.state()]);
  protected readonly classes = computed(() => CLASSES[this.state()]);
}
