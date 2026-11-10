import { Component, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { Page } from '../../../core/api/page';
import { BalanceRow } from '../stock.models';

/** Le détail par lot d'un article, chargé seulement quand on déplie sa ligne. */
@Component({
  selector: 'app-article-lots',
  imports: [DatePipe, DecimalPipe, HlmSkeletonImports],
  template: `
    @if (balances.isLoading()) {
      <div hlmSkeleton class="h-16 w-full max-w-xl"></div>
    } @else if (balances.error()) {
      <p class="text-sm text-destructive">Impossible de charger les lots de cet article.</p>
    } @else if (balances.hasValue()) {
      <table class="w-full max-w-xl text-sm">
        <thead>
          <tr class="text-left text-xs text-muted-foreground">
            <th class="py-1.5 font-medium">Lot</th>
            <th class="py-1.5 text-right font-medium">Quantité</th>
            <th class="py-1.5 pl-6 font-medium">Dernière mise à jour</th>
          </tr>
        </thead>
        <tbody>
          @for (lot of balances.value().content; track lot.lotId) {
            <tr class="border-t border-border/60">
              <td class="py-1.5 font-mono text-[13px]">{{ lot.lotNumber }}</td>
              <td class="py-1.5 text-right tabular-nums">
                {{ lot.quantity | number: '1.0-4' }}
                <span class="text-xs text-muted-foreground">{{ unitCode() }}</span>
              </td>
              <td class="py-1.5 pl-6 text-muted-foreground">
                {{ lot.updatedAt | date: 'd MMM y, HH:mm' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class ArticleLots {
  readonly articleId = input.required<string>();
  readonly unitCode = input('');

  // La fonction est réévaluée si articleId change : httpResource relance alors la requête tout seul
  protected readonly balances = httpResource<Page<BalanceRow>>(() => ({
    url: '/api/stock/balances',
    params: { articleId: this.articleId(), includeEmpty: false, size: 100 },
  }));
}
