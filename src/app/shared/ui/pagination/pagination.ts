import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';

/** Le bas de tableau : nombre de résultats et boutons Précédent / Suivant. La page commence à 1. */
@Component({
  selector: 'app-pagination',
  imports: [DecimalPipe, NgIcon, HlmButtonImports],
  viewProviders: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  template: `
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground"
    >
      <span>{{ totalElements() | number }} {{ itemLabel() }}</span>
      @if (totalPages() > 1) {
        <div class="flex items-center gap-2">
          <button
            hlmBtn
            variant="outline"
            size="sm"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            <ng-icon name="lucideChevronLeft" aria-hidden="true" /> Précédent
          </button>
          <span class="px-2 tabular-nums">Page {{ page() }} sur {{ totalPages() }}</span>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            [disabled]="page() >= totalPages()"
            (click)="pageChange.emit(page() + 1)"
          >
            Suivant <ng-icon name="lucideChevronRight" aria-hidden="true" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  /** "article(s)", "client(s)"… */
  readonly itemLabel = input('résultat(s)');
  readonly pageChange = output<number>();
}
