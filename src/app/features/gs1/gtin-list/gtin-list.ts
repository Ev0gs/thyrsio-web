import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideCopy,
  lucideDownload,
  lucidePlus,
  lucideRotateCw,
  lucideSearch,
  lucideSettings2,
} from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';
import { Pagination } from '../../../shared/ui/pagination/pagination';
import { Ean13Barcode } from '../ean13-barcode/ean13-barcode';
import { Gs1Api } from '../gs1-api';
import {
  describePackaging,
  formatGtin,
  Gs1Prefix,
  Gtin,
  GtinPackaging,
  GtinStatus,
  PACKAGING_LABELS,
} from '../gs1.models';
import { GtinForm } from './gtin-form';
import { PrefixManager } from './prefix-manager';

const PAGE_SIZE = 50;

type Dialog =
  | { kind: 'generate' }
  | { kind: 'record' }
  | { kind: 'prefixes' }
  | { kind: 'detail'; gtin: Gtin; created?: boolean }
  | { kind: 'retire'; gtin: Gtin };

/**
 * Les gencodes des produits finis : ceux générés ici, à partir des préfixes GS1 de l'entreprise,
 * et ceux repris de l'ancien tableur. Un gencode désigne une bouteille ou un groupé (carton, caisse bois...).
 */
@Component({
  selector: 'app-gtin-list',
  imports: [
    PageIcon,
    DatePipe,
    DecimalPipe,
    NgIcon,
    Pagination,
    Ean13Barcode,
    GtinForm,
    PrefixManager,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideCheck,
      lucideCopy,
      lucideDownload,
      lucidePlus,
      lucideRotateCw,
      lucideSearch,
      lucideSettings2,
    }),
  ],
  templateUrl: './gtin-list.html',
})
export class GtinList {
  private readonly api = inject(Gs1Api);

  /** Les filtres : la largeur de leur contenu, pas toute la ligne. */
  protected readonly filterClass = SELECT_CLASS.replace('w-full', 'w-auto');
  protected readonly packagingLabels = PACKAGING_LABELS;
  protected readonly packagings: GtinPackaging[] = ['BOTTLE', 'CARTON', 'WOODEN_CASE', 'OTHER'];
  protected readonly formatGtin = formatGtin;
  protected readonly describePackaging = describePackaging;

  protected readonly search = signal('');
  protected readonly packaging = signal<GtinPackaging | ''>('');
  protected readonly status = signal<GtinStatus | ''>('ACTIVE');
  protected readonly page = signal(1);

  protected readonly prefixes = httpResource<Gs1Prefix[]>(() => '/api/gs1/prefixes');
  protected readonly prefixRows = computed(() =>
    this.prefixes.hasValue() ? this.prefixes.value() : [],
  );
  protected readonly canGenerate = computed(() =>
    this.prefixRows().some((p) => p.active && p.remaining > 0),
  );

  protected readonly gtins = httpResource<Page<Gtin>>(() => {
    const params: Record<string, string | number> = { page: this.page() - 1, size: PAGE_SIZE };
    if (this.search().trim()) params['q'] = this.search().trim();
    if (this.packaging()) params['packaging'] = this.packaging();
    if (this.status()) params['status'] = this.status();
    return { url: '/api/gs1/gtins', params };
  });
  protected readonly rows = computed(() =>
    this.gtins.hasValue() ? this.gtins.value().content : [],
  );
  protected readonly pageInfo = computed(() =>
    this.gtins.hasValue() ? this.gtins.value().page : null,
  );
  protected readonly hasFilters = computed(
    () => !!(this.search().trim() || this.packaging() || this.status() !== 'ACTIVE'),
  );

  protected readonly dialog = signal<Dialog | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly copied = signal<string | null>(null);

  protected setFilter(apply: () => void): void {
    apply();
    this.page.set(1);
  }

  protected open(dialog: Dialog): void {
    this.actionError.set(null);
    this.dialog.set(dialog);
  }

  /** Un gencode créé : on le montre aussitôt, avec son code-barres. */
  protected onCreated(gtin: Gtin): void {
    this.gtins.reload();
    this.prefixes.reload();
    this.dialog.set({ kind: 'detail', gtin, created: true });
  }

  protected onPrefixesChanged(): void {
    this.prefixes.reload();
  }

  protected async copy(gtin: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(gtin);
      this.copied.set(gtin);
      setTimeout(() => this.copied.set(null), 1500);
    } catch {
      // Presse-papiers refusé : le gencode reste sélectionnable à la main
    }
  }

  /** Le code-barres en SVG, pour l'étiquette ou l'imprimeur : vectoriel, il s'agrandit sans flou. */
  protected download(gtin: Gtin): void {
    const svg = document.querySelector('#gtin-detail-barcode svg');
    if (!svg) {
      return;
    }
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${gtin.gtin}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  protected async retire(gtin: Gtin): Promise<void> {
    this.busy.set(true);
    try {
      const retired = await this.api.retire(gtin.id);
      this.gtins.reload();
      this.dialog.set({ kind: 'detail', gtin: retired });
    } catch (error) {
      this.actionError.set(problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
