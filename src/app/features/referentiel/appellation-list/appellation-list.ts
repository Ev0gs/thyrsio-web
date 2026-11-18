import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideRotateCw } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemMessage } from '../../../core/api/problem';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';
import { ReferentielApi } from '../referentiel-api';
import { AppellationRow } from '../referentiel.models';
import { AppellationForm } from './appellation-form';

/** Les appellations et leur sigle, qui fait le début des numéros de lot (Bordeaux, BX → LBX2401). */
@Component({
  selector: 'app-appellation-list',
  imports: [
    PageIcon,
    NgIcon,
    AppellationForm,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideRotateCw })],
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="flex items-center gap-3 text-[28px] font-semibold tracking-tight">
          <app-page-icon name="lucideMapPin" />
          Appellations
        </h1>
        <p class="text-sm text-muted-foreground">
          Leur sigle commence les numéros de lot des mises : L + sigle + millésime + numéro d'ordre
          (LBX2401).
        </p>
      </div>
      <button hlmBtn size="lg" (click)="open(null)">
        <ng-icon name="lucidePlus" aria-hidden="true" /> Nouvelle appellation
      </button>
    </header>

    @if (actionError(); as message) {
      <p
        role="alert"
        class="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive lg:max-w-3xl"
      >
        {{ message }}
      </p>
    }

    <section class="mt-6 overflow-hidden rounded-xl border border-border lg:max-w-3xl">
      @if (appellations.error()) {
        <div class="flex flex-col items-center gap-3 p-10 text-center">
          <p class="text-sm font-medium">Impossible de charger les appellations.</p>
          <button hlmBtn variant="outline" (click)="appellations.reload()">
            <ng-icon name="lucideRotateCw" aria-hidden="true" /> Réessayer
          </button>
        </div>
      } @else {
        <div hlmTableContainer [class.opacity-60]="appellations.isLoading()">
          <table hlmTable>
            <thead hlmTHead class="bg-muted/50">
              <tr hlmTr>
                <th hlmTh>Appellation</th>
                <th hlmTh>Sigle</th>
                <th hlmTh>Exemple de lot</th>
                <th hlmTh><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody hlmTBody>
              @if (!appellations.hasValue()) {
                @for (i of [1, 2, 3]; track i) {
                  <tr hlmTr>
                    <td hlmTd colspan="4"><div hlmSkeleton class="h-7 w-full"></div></td>
                  </tr>
                }
              } @else {
                @for (appellation of rows(); track appellation.id) {
                  <tr hlmTr [class.text-muted-foreground]="!appellation.active">
                    <td hlmTd class="font-medium">
                      {{ appellation.name }}
                      @if (!appellation.active) {
                        <span hlmBadge variant="outline" class="ml-2">Archivée</span>
                      }
                    </td>
                    <td hlmTd class="font-mono font-semibold">{{ appellation.code }}</td>
                    <td hlmTd class="font-mono text-muted-foreground">
                      L{{ appellation.code }}2401
                    </td>
                    <td hlmTd class="text-right whitespace-nowrap">
                      <button
                        hlmBtn
                        variant="ghost"
                        size="sm"
                        (click)="toggle(appellation)"
                        [attr.aria-label]="
                          (appellation.active ? 'Archiver ' : 'Réactiver ') + appellation.name
                        "
                      >
                        {{ appellation.active ? 'Archiver' : 'Réactiver' }}
                      </button>
                      <button
                        hlmBtn
                        variant="ghost"
                        size="sm"
                        (click)="open(appellation)"
                        [attr.aria-label]="'Modifier ' + appellation.name"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr hlmTr>
                    <td hlmTd colspan="4" class="py-10 text-center text-muted-foreground">
                      Aucune appellation : ajoute celles des vins mis en bouteille.
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </section>
    <p class="mt-2 text-xs text-muted-foreground lg:max-w-3xl">
      Une appellation archivée ne se choisit plus pour une nouvelle production ; les numéros déjà
      attribués restent.
    </p>

    <hlm-dialog [state]="dialogState()" (closed)="dialogState.set('closed')">
      <hlm-dialog-content *hlmDialogPortal="let ctx" class="sm:max-w-lg">
        <hlm-dialog-header>
          <h3 hlmDialogTitle>
            {{ editing() ? "Modifier l'appellation" : 'Nouvelle appellation' }}
          </h3>
        </hlm-dialog-header>
        <app-appellation-form
          [appellation]="editing()"
          (saved)="ctx.close(); onSaved()"
          (cancelled)="ctx.close()"
        />
      </hlm-dialog-content>
    </hlm-dialog>
  `,
})
export class AppellationList {
  private readonly api = inject(ReferentielApi);

  protected readonly appellations = httpResource<AppellationRow[]>(() => ({
    url: '/api/referentiel/appellations',
    params: { includeArchived: true },
  }));
  protected readonly rows = computed(() =>
    this.appellations.hasValue() ? this.appellations.value() : [],
  );

  protected readonly dialogState = signal<'open' | 'closed'>('closed');
  protected readonly editing = signal<AppellationRow | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected open(appellation: AppellationRow | null): void {
    this.editing.set(appellation);
    this.dialogState.set('open');
  }

  protected onSaved(): void {
    this.dialogState.set('closed');
    this.appellations.reload();
  }

  protected async toggle(appellation: AppellationRow): Promise<void> {
    this.actionError.set(null);
    try {
      await this.api.setAppellationActive(appellation.id, !appellation.active);
      this.appellations.reload();
    } catch (error) {
      this.actionError.set(problemMessage(error));
    }
  }
}
