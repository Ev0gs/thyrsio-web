import { Component, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { InventoryStatus } from '../stock.models';

@Component({
  selector: 'app-inventory-status-badge',
  imports: [HlmBadgeImports],
  template: `
    @switch (status()) {
      @case ('DRAFT') {
        <span hlmBadge variant="secondary" class="bg-sky-50 text-sky-700">Brouillon</span>
      }
      @case ('VALIDATED') {
        <span hlmBadge variant="secondary" class="bg-emerald-50 text-emerald-700">Validé</span>
      }
      @case ('CANCELLED') {
        <span hlmBadge variant="outline">Annulé</span>
      }
    }
  `,
})
export class InventoryStatusBadge {
  readonly status = input.required<InventoryStatus>();
}
