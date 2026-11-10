import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { applyWhen, form, FormField, hidden, min, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { StockApi } from '../stock-api';
import { Inventory, LotRow, StockOverviewRow } from '../stock.models';

const emptyLine = () => ({ articleId: '', lotId: '', countedQuantity: null as number | null });

/** Ajoute une ligne à un inventaire en brouillon : un article, ou un lot, absent du pré-remplissage. */
@Component({
  selector: 'app-inventory-add-line',
  imports: [FormField, FieldError, HlmButtonImports, HlmInputImports],
  templateUrl: './inventory-add-line.html',
})
export class InventoryAddLine {
  readonly inventoryId = input.required<string>();
  readonly articles = input.required<StockOverviewRow[]>();
  readonly added = output<Inventory>();

  private readonly api = inject(StockApi);

  protected readonly selectClass = SELECT_CLASS;

  protected readonly model = signal(emptyLine());

  protected readonly lineForm = form(this.model, (path) => {
    required(path.articleId, { message: 'Choisis un article' });
    hidden(path.lotId, { when: ({ valueOf }) => !this.isLotTracked(valueOf(path.articleId)) });
    applyWhen(
      path.lotId,
      ({ valueOf }) => this.isLotTracked(valueOf(path.articleId)),
      (lotId) => {
        required(lotId, { message: 'Choisis un lot' });
      },
    );
    min(path.countedQuantity, 0, { message: 'Une quantité comptée ne peut pas être négative' });
  });

  protected readonly articleOptions = computed(() =>
    this.articles()
      .filter((article) => article.active)
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );

  private readonly selectedArticle = computed(() =>
    this.articles().find((article) => article.articleId === this.lineForm.articleId().value()),
  );

  protected readonly lots = httpResource<LotRow[]>(() => {
    const article = this.selectedArticle();
    return article?.lotTracked ? { url: '/api/stock/lots', params: { articleId: article.articleId } } : undefined;
  });

  constructor() {
    // Même règle que pour un mouvement : changer d'article vide le lot
    effect(() => {
      this.lineForm.articleId().value();
      untracked(() => this.lineForm.lotId().value.set(''));
    });
  }

  private isLotTracked(articleId: string): boolean {
    return this.articles().find((article) => article.articleId === articleId)?.lotTracked ?? false;
  }

  protected async add(): Promise<void> {
    await submit(this.lineForm, {
      action: async () => {
        const value = this.model();
        try {
          const inventory = await this.api.addInventoryLine(this.inventoryId(), {
            articleId: value.articleId,
            lotId: this.selectedArticle()?.lotTracked ? value.lotId : null,
            countedQuantity: value.countedQuantity,
            notes: null,
          });
          // Formulaire vidé pour la ligne suivante ; reset() efface aussi l'état "touché"
          this.model.set(emptyLine());
          this.lineForm().reset();
          this.added.emit(inventory);
          return undefined;
        } catch (error) {
          return { fieldTree: this.lineForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
