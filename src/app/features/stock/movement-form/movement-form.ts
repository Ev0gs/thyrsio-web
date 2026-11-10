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
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  applyWhen,
  form,
  FormField,
  hidden,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { StockApi } from '../stock-api';
import {
  BalanceRow,
  LotRow,
  ManualMovementType,
  MOVEMENT_TYPE_LABELS,
  StockOverviewRow,
} from '../stock.models';

/** Valeur spéciale du champ lot : "créer un nouveau lot". */
const NEW_LOT = '__new__';

/** La date du jour en heure locale, au format AAAA-MM-JJ (le format suédois est justement celui-là). */
const todayLocal = () => new Date().toLocaleDateString('sv-SE');

/** Aujourd'hui : l'API met l'heure exacte. Un autre jour : midi, heure locale. */
function toInstant(day: string): string | null {
  return !day || day === todayLocal() ? null : new Date(`${day}T12:00:00`).toISOString();
}

/** Le modèle du formulaire. Pas de null pour les textes : Signal Forms préfère des chaînes vides. */
interface MovementModel {
  type: ManualMovementType;
  articleId: string;
  lotId: string; // '' : aucun ; NEW_LOT : lot à créer
  newLotNumber: string;
  quantity: number | null;
  occurredOn: string; // AAAA-MM-JJ
  reference: string;
  notes: string;
}

@Component({
  selector: 'app-movement-form',
  imports: [DecimalPipe, FormField, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './movement-form.html',
})
export class MovementForm {
  /** Les articles proposés : ceux de l'écran Stock, déjà chargés (pas d'appel de plus). */
  readonly articles = input.required<StockOverviewRow[]>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(StockApi);

  protected readonly NEW_LOT = NEW_LOT;
  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  /** Les types proposés, dans l'ordre d'affichage. */
  protected readonly types: ManualMovementType[] = [
    'RECEPTION',
    'CONSUMPTION',
    'LOSS',
    'ADJUSTMENT',
  ];
  protected readonly typeHints: Record<ManualMovementType, string> = {
    RECEPTION: 'Marchandise livrée par un fournisseur : le stock augmente.',
    CONSUMPTION: 'Matière utilisée pour une mise : le stock diminue.',
    LOSS: 'Casse ou produit abîmé : le stock diminue.',
    ADJUSTMENT: "Correction d'une erreur : saisis + pour ajouter, − pour retirer.",
  };
  protected readonly selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none ' +
    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

  // ---------- Le modèle et ses règles ----------

  protected readonly model = signal<MovementModel>({
    type: 'RECEPTION',
    articleId: '',
    lotId: '',
    newLotNumber: '',
    quantity: null,
    occurredOn: todayLocal(),
    reference: '',
    notes: '',
  });

  protected readonly movementForm = form(this.model, (path) => {
    required(path.articleId, { message: 'Choisis un article' });
    required(path.occurredOn, { message: 'Indique la date du mouvement' });
    required(path.quantity, { message: 'Indique une quantité' });

    // Le signe : positif pour une entrée ou une sortie (le type donne le sens), non nul pour un ajustement
    validate(path.quantity, ({ value, valueOf }) => {
      const quantity = value();
      if (quantity === null) {
        return undefined; // déjà signalé par required
      }
      if (valueOf(path.type) === 'ADJUSTMENT') {
        return quantity === 0
          ? { kind: 'zero', message: 'Un ajustement ne peut pas être nul' }
          : undefined;
      }
      return quantity <= 0
        ? { kind: 'positive', message: 'Saisis une quantité positive : le sens vient du type' }
        : undefined;
    });

    // Le lot n'existe que pour un article suivi par lot : masqué sinon, obligatoire dans ce cas
    hidden(path.lotId, { when: ({ valueOf }) => !this.isLotTracked(valueOf(path.articleId)) });
    applyWhen(
      path.lotId,
      ({ valueOf }) => this.isLotTracked(valueOf(path.articleId)),
      (lotId) => {
        required(lotId, { message: 'Choisis un lot' });
      },
    );
    validate(path.lotId, ({ value, valueOf }) =>
      value() === NEW_LOT && valueOf(path.type) !== 'RECEPTION'
        ? { kind: 'newLotOnlyOnReception', message: "Un nouveau lot ne se crée qu'à la réception" }
        : undefined,
    );

    // Le numéro du nouveau lot : visible et obligatoire seulement si on a choisi "Nouveau lot"
    hidden(path.newLotNumber, { when: ({ valueOf }) => valueOf(path.lotId) !== NEW_LOT });
    applyWhen(
      path.newLotNumber,
      ({ valueOf }) => valueOf(path.lotId) === NEW_LOT,
      (lotNumber) => {
        required(lotNumber, { message: 'Indique le numéro du nouveau lot' });
      },
    );

    // AAAA-MM-JJ : la comparaison de chaînes suffit pour comparer deux dates
    validate(path.occurredOn, ({ value }) =>
      value() > todayLocal()
        ? { kind: 'future', message: 'La date ne peut pas être dans le futur' }
        : undefined,
    );
  });

  // ---------- Ce qui dépend de l'article choisi ----------

  protected readonly articleOptions = computed(() =>
    this.articles()
      .filter((article) => article.active) // filter() renvoie une copie : sort() ne modifie pas l'input
      .sort((a, b) => a.articleLabel.localeCompare(b.articleLabel, 'fr')),
  );

  protected readonly selectedArticle = computed(() =>
    this.articles().find((article) => article.articleId === this.movementForm.articleId().value()),
  );

  /** Les lots de l'article (undefined : pas d'appel tant qu'aucun article suivi par lot n'est choisi). */
  protected readonly lots = httpResource<LotRow[]>(() => {
    const article = this.selectedArticle();
    return article?.lotTracked
      ? { url: '/api/stock/lots', params: { articleId: article.articleId } }
      : undefined;
  });

  /** Le stock de chaque lot, pour l'afficher dans la liste. */
  private readonly lotBalances = httpResource<Page<BalanceRow>>(() => {
    const article = this.selectedArticle();
    return article?.lotTracked
      ? {
          url: '/api/stock/balances',
          params: { articleId: article.articleId, includeEmpty: true, size: 100 },
        }
      : undefined;
  });

  protected readonly lotOptions = computed(() => {
    const lots = this.lots.hasValue() ? this.lots.value() : [];
    const balances = this.lotBalances.hasValue() ? this.lotBalances.value().content : [];
    const stockByLot = new Map(balances.map((balance) => [balance.lotId, balance.quantity]));
    return lots.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber,
      quantity: stockByLot.get(lot.id) ?? 0,
    }));
  });

  constructor() {
    // Changer d'article vide le lot choisi : un lot appartient à un seul article.
    // L'effet ne lit QUE l'article ; il écrit le lot dans untracked() pour ne pas en dépendre.
    effect(() => {
      this.movementForm.articleId().value();
      untracked(() => {
        this.movementForm.lotId().value.set('');
        this.movementForm.newLotNumber().value.set('');
      });
    });
  }

  private isLotTracked(articleId: string): boolean {
    return this.articles().find((article) => article.articleId === articleId)?.lotTracked ?? false;
  }

  // ---------- Enregistrement ----------

  protected async save(): Promise<void> {
    // submit() marque tous les champs comme touchés et n'exécute l'action que si tout est valide
    await submit(this.movementForm, {
      action: async () => {
        const value = this.model();
        try {
          let lotId: string | null = null;
          if (this.selectedArticle()?.lotTracked) {
            lotId = value.lotId;
            if (lotId === NEW_LOT) {
              const lot = await this.api.createLot(value.articleId, value.newLotNumber.trim());
              // Si le mouvement échoue ensuite, un nouvel essai réutilise ce lot au lieu de le recréer
              this.movementForm.lotId().value.set(lot.id);
              this.lots.reload();
              lotId = lot.id;
            }
          }
          await this.api.recordMovement({
            articleId: value.articleId,
            lotId,
            type: value.type,
            quantity: value.quantity!,
            occurredAt: toInstant(value.occurredOn),
            reference: value.reference.trim() || null,
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          // Le refus de l'API s'affiche sur le formulaire : "Stock insuffisant…", "Trop de décimales…"
          return { fieldTree: this.movementForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
