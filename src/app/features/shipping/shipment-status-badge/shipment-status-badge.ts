import { Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { SHIPMENT_STATUS_LABELS, ShipmentStatus } from '../shipping.models';

const CLASSES: Record<ShipmentStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
};

@Component({
  selector: 'app-shipment-status-badge',
  imports: [HlmBadgeImports],
  template: `<span hlmBadge variant="secondary" [class]="classes()">{{ label() }}</span>`,
})
export class ShipmentStatusBadge {
  readonly status = input.required<ShipmentStatus>();

  protected readonly label = computed(() => SHIPMENT_STATUS_LABELS[this.status()]);
  protected readonly classes = computed(() => CLASSES[this.status()]);
}
