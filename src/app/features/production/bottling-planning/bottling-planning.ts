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
import { LineToPlan } from '../../sales/sales.models';
import { BottlingForm, BottlingPrefill } from '../bottling-form/bottling-form';
import { BottlingStateBadge } from '../bottling-state-badge/bottling-state-badge';
import {
  addDays,
  Bottling,
  BottlingRow,
  isoWeekNumber,
  mondayOf,
  parseDay,
} from '../production.models';

interface PlanningDay {
  day: string;
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  bottlings: { bottling: BottlingRow; dayIndex: number; dayCount: number }[];
  totalBottles: number;
}

/** Le planning des mises : une semaine à la fois (?semaine=AAAA-MM-JJ, le lundi), et les mises à venir. */
@Component({
  selector: 'app-bottling-planning',
  imports: [
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
  protected readonly today = todayLocal();

  protected readonly monday = computed(() => mondayOf(this.semaine() || this.today));
  protected readonly sunday = computed(() => addDays(this.monday(), 6));
  protected readonly weekNumber = computed(() => isoWeekNumber(this.monday()));
  protected readonly isCurrentWeek = computed(() => this.monday() === mondayOf(this.today));

  /** Les mises qui touchent la semaine affichée. */
  protected readonly week = httpResource<Page<BottlingRow>>(() => ({
    url: '/api/production/bottlings',
    params: { from: this.monday(), to: this.sunday(), size: 200 },
  }));

  /** Toutes les mises planifiées, quelle que soit la semaine : pour la liste « À venir » et les alertes. */
  protected readonly upcoming = httpResource<Page<BottlingRow>>(() => ({
    url: '/api/production/bottlings',
    params: { status: 'PLANNED', size: 200 },
  }));

  /** Les lignes de commande que ni le stock ni les mises ne couvrent : des mises à planifier. */
  protected readonly toPlan = httpResource<LineToPlan[]>(() => '/api/sales/order-lines/to-plan');
  protected readonly toPlanRows = computed(() =>
    this.toPlan.hasValue() ? this.toPlan.value() : [],
  );

  protected readonly upcomingRows = computed(() =>
    this.upcoming.hasValue() ? this.upcoming.value().content : [],
  );
  protected readonly alerts = computed(() => this.upcomingRows().filter((row) => row.alert));

  /** Les 7 jours de la semaine, chacun avec les mises qui s'y déroulent (une mise de 2 jours apparaît 2 fois). */
  protected readonly days = computed<PlanningDay[]>(() => {
    const rows = (this.week.hasValue() ? this.week.value().content : []).filter(
      (row) => row.status !== 'CANCELLED',
    );
    return Array.from({ length: 7 }, (_, offset) => {
      const day = addDays(this.monday(), offset);
      const bottlings = rows
        .filter((row) => row.startDate <= day && day <= row.endDate)
        .map((bottling) => ({
          bottling,
          dayIndex:
            Math.round(
              (parseDay(day).getTime() - parseDay(bottling.startDate).getTime()) / 86_400_000,
            ) + 1,
          dayCount:
            Math.round(
              (parseDay(bottling.endDate).getTime() - parseDay(bottling.startDate).getTime()) /
                86_400_000,
            ) + 1,
        }));
      return {
        day,
        date: parseDay(day),
        isToday: day === this.today,
        isWeekend: offset >= 5,
        bottlings,
        // Une mise sur plusieurs jours n'est comptée que le premier jour
        totalBottles: bottlings
          .filter((entry) => entry.dayIndex === 1)
          .reduce(
            (sum, entry) => sum + (entry.bottling.producedBottles ?? entry.bottling.plannedBottles),
            0,
          ),
      };
    });
  });

  protected readonly dialogOpen = signal(false);
  protected readonly newDay = signal<string | null>(null);
  protected readonly prefill = signal<BottlingPrefill | null>(null);

  protected orderCodes(row: BottlingRow): string {
    return [...new Set(row.allocations.map((a) => a.orderCode))].join(', ');
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
