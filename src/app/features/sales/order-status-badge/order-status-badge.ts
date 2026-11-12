import { Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { ORDER_STATUS_LABELS, OrderStatus } from '../sales.models';

const CLASSES: Record<OrderStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-sky-50 text-sky-700',
  PARTIALLY_SHIPPED: 'bg-amber-50 text-amber-700',
  SHIPPED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-muted text-muted-foreground line-through',
};

@Component({
  selector: 'app-order-status-badge',
  imports: [HlmBadgeImports],
  template: `<span hlmBadge variant="secondary" [class]="classes()">{{ label() }}</span>`,
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();

  protected readonly label = computed(() => ORDER_STATUS_LABELS[this.status()]);
  protected readonly classes = computed(() => CLASSES[this.status()]);
}
