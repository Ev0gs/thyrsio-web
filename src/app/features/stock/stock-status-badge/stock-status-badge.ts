import { Component, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { StockStatus } from '../stock.models';

/** Le badge d'état d'un article : réutilisé par l'écran Stock et le tableau de bord. */
@Component({
  selector: 'app-stock-status-badge',
  imports: [HlmBadgeImports],
  template: `
    @switch (status()) {
      @case ('OK') {
        <span hlmBadge variant="secondary" class="bg-emerald-50 text-emerald-700">OK</span>
      }
      @case ('BELOW_THRESHOLD') {
        <span hlmBadge variant="secondary" class="bg-amber-50 text-amber-700">Sous le seuil</span>
      }
      @case ('OUT_OF_STOCK') {
        <span hlmBadge variant="destructive">Rupture</span>
      }
    }
  `,
})
export class StockStatusBadge {
  readonly status = input.required<StockStatus>();
}
