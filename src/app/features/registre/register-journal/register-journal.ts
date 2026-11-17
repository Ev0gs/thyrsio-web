import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronRight,
  lucideRotateCw,
  lucideShieldAlert,
  lucideShieldCheck,
  lucideX,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { startOfDay } from '../../../core/dates';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import {
  describeData,
  kindLabel,
  REGISTER_BOOK_LABELS,
  RegisterBook,
  RegisterEntry,
  RegisterVerification,
} from '../registre.models';

const PAGE_SIZE = 50;

type FilterName = 'registre' | 'from' | 'to' | 'q' | 'retard' | 'lot';

/**
 * Le cahier de chai : les écritures du registre, numérotées, de la plus récente à la plus ancienne.
 * Rien ne s'y saisit : chaque opération de la cuverie et de la production y écrit sa ligne.
 * Une écriture ne se modifie jamais ; une erreur se corrige par une contre-écriture, visible ici.
 * Filtres dans l'URL, pour pouvoir partager ou retrouver une recherche.
 */
@Component({
  selector: 'app-register-journal',
  imports: [
    PageIcon,
    DatePipe,
    DecimalPipe,
    RouterLink,
    NgIcon,
    Pagination,
    HlmBadgeImports,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideChevronDown,
      lucideChevronRight,
      lucideRotateCw,
      lucideShieldAlert,
      lucideShieldCheck,
      lucideX,
    }),
  ],
  templateUrl: './register-journal.html',
})
export class RegisterJournal {
  private readonly router = inject(Router);

  readonly registre = input<RegisterBook>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly q = input<string>();
  readonly retard = input<string>();
  /** Un lot de vin (depuis sa fiche : « Voir au cahier de chai »). */
  readonly lot = input<string>();
  readonly page = input(1, {
    transform: (value: string | undefined) => Math.max(1, Number(value) || 1),
  });

  protected readonly bookLabels = REGISTER_BOOK_LABELS;
  protected readonly books = Object.keys(REGISTER_BOOK_LABELS) as RegisterBook[];
  protected readonly selectClass = SELECT_CLASS;
  protected readonly kindLabel = kindLabel;
  protected readonly describeData = describeData;

  private readonly apiParams = computed(() => {
    const params: Record<string, string | number | boolean> = {
      page: this.page() - 1,
      size: PAGE_SIZE,
    };
    const book = this.registre();
    const from = this.from();
    const to = this.to();
    const q = this.q()?.trim();
    const lot = this.lot();
    if (book) params['book'] = book;
    if (from) params['from'] = startOfDay(from);
    if (to) params['to'] = startOfDay(to, 1);
    if (q) params['q'] = q;
    if (lot) params['wineLotId'] = lot;
    if (this.lateOnly()) params['late'] = true;
    return params;
  });

  protected readonly entries = httpResource<Page<RegisterEntry>>(() => ({
    url: '/api/registre/entries',
    params: this.apiParams(),
  }));

  /** L'intégrité de tout le registre : recalculée à chaque ouverture de la page. */
  protected readonly verification = httpResource<RegisterVerification>(
    () => '/api/registre/verify',
  );

  protected readonly lateOnly = computed(() => this.retard() === '1');
  protected readonly rows = computed(() =>
    this.entries.hasValue() ? this.entries.value().content : [],
  );
  protected readonly pageInfo = computed(() =>
    this.entries.hasValue() ? this.entries.value().page : null,
  );
  /** Le lot filtré, nommé d'après ses écritures (la fiche du lot n'est pas rechargée pour ça). */
  protected readonly lotCode = computed(
    () => this.rows().find((entry) => entry.wineLotId === this.lot())?.wineLotCode ?? 'filtré',
  );
  protected readonly hasFilters = computed(
    () =>
      !!(this.registre() || this.from() || this.to() || this.q() || this.lateOnly() || this.lot()),
  );

  /** Les écritures dépliées (le détail des colonnes et l'empreinte). */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected toggle(id: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Le numéro de l'écriture corrigée, quand elle est sur la même page. */
  protected correctedSequence(entry: RegisterEntry): number | null {
    return this.rows().find((row) => row.id === entry.correctsEntryId)?.sequenceNo ?? null;
  }

  protected setFilter(name: FilterName, value: string): void {
    this.router.navigate([], {
      queryParams: { [name]: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goToPage(page: number): void {
    this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilters(): void {
    this.router.navigate([], { queryParams: {} });
  }
}
