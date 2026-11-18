import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required, submit, validate } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { StockApi } from '../stock-api';
import { ManualMovementType, MOVEMENT_TYPE_LABELS, StockOverviewRow } from '../stock.models';

/** Le modèle du formulaire. Pas de null pour les textes : Signal Forms préfère des chaînes vides. */
interface MovementModel {
  type: ManualMovementType;
  articleId: string;
  quantity: number | null;
  occurredOn: string; // AAAA-MM-JJ
  reference: string;
  notes: string;
}

@Component({
  selector: 'app-movement-form',
  imports: [
    DecimalPipe,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  templateUrl: './movement-form.html',
})
export class MovementForm {
  /** Les articles proposés : ceux de l'écran Stock, déjà chargés (pas d'appel de plus). */
  readonly articles = input.required<StockOverviewRow[]>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(StockApi);

  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  protected readonly selectClass = SELECT_CLASS;
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

  // ---------- Le modèle et ses règles ----------

  protected readonly model = signal<MovementModel>({
    type: 'RECEPTION',
    articleId: '',
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

  // ---------- Enregistrement ----------

  protected async save(): Promise<void> {
    // submit() marque tous les champs comme touchés et n'exécute l'action que si tout est valide
    await submit(this.movementForm, {
      action: async () => {
        const value = this.model();
        try {
          // Les matières sèches ne sont pas suivies par lot : le mouvement porte sur l'article
          await this.api.recordMovement({
            articleId: value.articleId,
            lotId: null,
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
