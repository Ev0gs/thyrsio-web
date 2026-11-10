import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCw, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { problemMessage } from '../../../core/api/problem';
import { InventoryAddLine } from '../inventory-add-line/inventory-add-line';
import { InventoryStatusBadge } from '../inventory-status-badge/inventory-status-badge';
import { StockApi } from '../stock-api';
import { Inventory, InventoryLine, StockOverviewRow } from '../stock.models';

@Component({
  selector: 'app-inventory-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    NgIcon,
    RouterLink,
    InventoryAddLine,
    InventoryStatusBadge,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  viewProviders: [provideIcons({ lucideRotateCw, lucideTrash2 })],
  templateUrl: './inventory-detail.html',
})
export class InventoryDetail {
  /** Le :id de l'URL, reçu grâce à withComponentInputBinding. */
  readonly id = input.required<string>();

  private readonly api = inject(StockApi);

  protected readonly inventory = httpResource<Inventory>(
    () => `/api/stock/inventories/${this.id()}`,
  );

  protected readonly current = computed(() =>
    this.inventory.hasValue() ? this.inventory.value() : null,
  );
  protected readonly isDraft = computed(() => this.current()?.status === 'DRAFT');
  protected readonly lines = computed(() => this.current()?.lines ?? []);
  protected readonly countedCount = computed(
    () => this.lines().filter((line) => line.countedQuantity !== null).length,
  );
  protected readonly allCounted = computed(
    () => this.lines().length > 0 && this.countedCount() === this.lines().length,
  );
  protected readonly gaps = computed(() =>
    this.lines().filter((line) => line.difference !== null && line.difference !== 0),
  );

  /** Les articles, pour le formulaire d'ajout : chargés seulement pour un brouillon. */
  protected readonly overview = httpResource<StockOverviewRow[]>(() =>
    this.isDraft() ? '/api/stock/overview' : undefined,
  );

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  /** La confirmation ouverte : valider ou annuler l'inventaire. */
  protected readonly confirm = signal<'validate' | 'cancel' | null>(null);

  // ---------- Les actions ----------

  /** Enregistre le comptage d'une ligne : appelé à Entrée ou en quittant le champ. */
  protected async count(line: InventoryLine, raw: string): Promise<void> {
    if (raw.trim() === '') {
      return; // champ vidé : on ne "décompte" pas une ligne
    }
    const quantity = Number(raw);
    if (!Number.isFinite(quantity) || quantity < 0) {
      this.error.set(
        `Quantité invalide pour ${line.articleLabel} : saisis un nombre positif ou nul.`,
      );
      return;
    }
    if (quantity === line.countedQuantity) {
      return; // rien n'a changé : pas d'appel inutile
    }
    await this.run(() => this.api.countInventoryLine(this.id(), line.id, quantity, line.notes));
  }

  protected removeLine(line: InventoryLine): Promise<void> {
    return this.run(() => this.api.removeInventoryLine(this.id(), line.id));
  }

  protected async confirmAction(): Promise<void> {
    const action = this.confirm();
    this.confirm.set(null);
    await this.run(() =>
      action === 'validate'
        ? this.api.validateInventory(this.id())
        : this.api.cancelInventory(this.id()),
    );
  }

  /** L'inventaire renvoyé par l'API vient d'être ajouté : on l'affiche tel quel. */
  protected onLineAdded(updated: Inventory): void {
    this.inventory.value.set(updated);
  }

  /**
   * Toutes les modifications passent ici. L'API renvoie l'inventaire à jour : on l'affiche tel quel
   * (pas de GET de plus). En cas d'erreur (ex. 409 : modifié par quelqu'un d'autre), on recharge.
   */
  private async run(action: () => Promise<Inventory | void>): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      const updated = await action();
      if (updated) {
        this.inventory.value.set(updated);
      } else {
        this.inventory.reload(); // DELETE ne renvoie rien (204)
      }
    } catch (error) {
      this.error.set(problemMessage(error));
      this.inventory.reload();
    } finally {
      this.busy.set(false);
    }
  }
}
