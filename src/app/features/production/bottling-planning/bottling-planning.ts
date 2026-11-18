import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucidePlus,
  lucideRotateCw,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { Page } from '../../../core/api/page';
import { todayLocal } from '../../../core/dates';
import { describeWine } from '../../cuverie/cuverie.models';
import { FEATURES } from '../../../core/features';
import { LineToPlan } from '../../sales/sales.models';
import { BottlingForm, BottlingPrefill } from '../bottling-form/bottling-form';
import { BottlingStateBadge } from '../bottling-state-badge/bottling-state-badge';
import {
  addDays,
  Bottling,
  bottlingSource,
  bottlingTitle,
  isoWeekNumber,
  mondayOf,
  parseDay,
  Production,
  PRODUCTION_SLOT_LABELS,
  SLOT_RANK,
} from '../production.models';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';

interface PlanningDay {
  day: string;
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  /** Les productions du jour, matin d'abord ; une production de 2 jours apparaît les 2 jours. */
  entries: { bottling: Bottling; production: Production; dayIndex: number; dayCount: number }[];
  totalBottles: number;
}

/**
 * Le planning des mises : une semaine à la fois (?semaine=AAAA-MM-JJ, le lundi), et les mises à venir.
 * Chaque jour montre ses productions : une mise qui fait un produit le matin et un autre l'après-midi
 * y apparaît deux fois, dans l'ordre de la journée.
 */
@Component({
  selector: 'app-bottling-planning',
  imports: [
    PageIcon,
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    BottlingForm,
    BottlingStateBadge,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
  ],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucidePlus,
      lucideRotateCw,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './bottling-planning.html',
})
export class BottlingPlanning {
  private readonly router = inject(Router);

  /** ?semaine=2026-11-09 ; absent : la semaine en cours. */
  readonly semaine = input<string>();

  protected readonly describeWine = describeWine;
  protected readonly slotLabels = PRODUCTION_SLOT_LABELS;
  protected readonly title = bottlingTitle;
  protected readonly source = bottlingSource;
  protected readonly today = todayLocal();

  protected readonly monday = computed(() => mondayOf(this.semaine() || this.today));
  protected readonly sunday = computed(() => addDays(this.monday(), 6));
  protected readonly weekNumber = computed(() => isoWeekNumber(this.monday()));
  protected readonly isCurrentWeek = computed(() => this.monday() === mondayOf(this.today));

  /** Les mises qui touchent la semaine affichée. */
  protected readonly week = httpResource<Page<Bottling>>(() => ({
    url: '/api/production/bottlings',
    params: { from: this.monday(), to: this.sunday(), size: 200 },
  }));

  /** Tout ce qui reste à faire, quelle que soit la semaine : pour la liste « À venir » et les alertes. */
  protected readonly upcoming = httpResource<Page<Bottling>>(() => ({
    url: '/api/production/bottlings',
    params: { status: 'PLANNED,IN_PROGRESS', size: 200 },
  }));

  /** Les lignes de commande que ni le stock ni les mises ne couvrent : des mises à planifier. */
  /** Seulement si les ventes sont affichées. */
  protected readonly sales = FEATURES.sales;
  protected readonly toPlan = httpResource<LineToPlan[]>(() =>
    this.sales ? '/api/sales/order-lines/to-plan' : undefined,
  );
  protected readonly toPlanRows = computed(() =>
    this.toPlan.hasValue() ? this.toPlan.value() : [],
  );

  protected readonly upcomingRows = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().content : [],
  );
  /** Les productions en alerte : des manquants, et elles commencent dans moins de 10 jours. */
  protected readonly alerts = computed(() =>
    this.upcomingRows().flatMap((bottling) =>
      bottling.productions
        .filter((production) => production.alert)
        .map((production) => ({ bottling, production })),
    ),
  );

  /** Les 7 jours de la semaine, chacun avec les productions qui s'y déroulent. */
  protected readonly days = computed<PlanningDay[]>(() => {
    const productions = (this.week.hasValue() ? this.week.value().content : []).flatMap(
      (bottling) =>
        bottling.productions
          .filter((production) => production.status !== 'CANCELLED')
          .map((production) => ({ bottling, production })),
    );
    const daysBetween = (from: string, to: string) =>
      Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
    return Array.from({ length: 7 }, (_, offset) => {
      const day = addDays(this.monday(), offset);
      const entries = productions
        .filter(({ production }) => production.startDate <= day && day <= production.endDate)
        .sort(
          (a, b) =>
            SLOT_RANK[a.production.slot] - SLOT_RANK[b.production.slot] ||
            a.bottling.code.localeCompare(b.bottling.code),
        )
        .map(({ bottling, production }) => ({
          bottling,
          production,
          dayIndex: daysBetween(production.startDate, day) + 1,
          dayCount: daysBetween(production.startDate, production.endDate) + 1,
        }));
      return {
        day,
        date: parseDay(day),
        isToday: day === this.today,
        isWeekend: offset >= 5,
        entries,
        // Une production sur plusieurs jours n'est comptée que le premier jour
        totalBottles: entries
          .filter((entry) => entry.dayIndex === 1)
          .reduce(
            (sum, entry) =>
              sum + (entry.production.producedBottles ?? entry.production.plannedBottles),
            0,
          ),
      };
    });
  });

  protected readonly dialogOpen = signal(false);
  protected readonly newDay = signal<string | null>(null);
  protected readonly prefill = signal<BottlingPrefill | null>(null);

  protected orderCodes(production: Production): string {
    return [...new Set(production.allocations.map((a) => a.orderCode))].join(', ');
  }

  protected goToWeek(offsetWeeks: number): void {
    const monday = addDays(this.monday(), offsetWeeks * 7);
    this.router.navigate([], {
      queryParams: { semaine: monday === mondayOf(this.today) ? null : monday },
    });
  }

  protected goToToday(): void {
    this.router.navigate([], { queryParams: {} });
  }

  protected plan(day: string | null): void {
    this.newDay.set(day);
    this.prefill.set(null);
    this.dialogOpen.set(true);
  }

  /** Une mise pour ce qui manque à une ligne de commande, réservée à celle-ci. */
  protected planFor(line: LineToPlan): void {
    this.newDay.set(null);
    this.prefill.set({
      finishedArticleId: line.articleId,
      plannedBottles: line.missing,
      allocations: [{ orderLineId: line.lineId, quantity: line.missing }],
    });
    this.dialogOpen.set(true);
  }

  protected onSaved(bottling: Bottling): void {
    this.dialogOpen.set(false);
    this.router.navigate(['/production/mises', bottling.id]);
  }
}
