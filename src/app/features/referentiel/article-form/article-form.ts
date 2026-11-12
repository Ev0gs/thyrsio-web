import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  applyWhen,
  form,
  FormField,
  hidden,
  maxLength,
  min,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { ReferentielApi } from '../referentiel-api';
import { ArticleRow, CategoryRow, SupplierRow, UnitRow } from '../referentiel.models';

interface ArticleModel {
  code: string;
  label: string;
  categoryCode: string;
  unitCode: string; // '' : l'unité par défaut de la catégorie
  mainSupplierId: string; // '' : aucun
  supplierReference: string;
  alertThreshold: number | null;
}

/** Le modèle de départ : vide pour une création, pré-rempli pour une modification. */
function toModel(article: ArticleRow | null): ArticleModel {
  return {
    code: article?.code ?? '',
    label: article?.label ?? '',
    categoryCode: article?.categoryCode ?? '',
    unitCode: '',
    mainSupplierId: article?.mainSupplierId ?? '',
    supplierReference: article?.supplierReference ?? '',
    alertThreshold: article?.alertThreshold ?? null,
  };
}

@Component({
  selector: 'app-article-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './article-form.html',
})
export class ArticleForm {
  /** null : création ; un article : modification. */
  readonly article = input<ArticleRow | null>(null);
  readonly saved = output<ArticleRow>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly isEdit = computed(() => this.article() !== null);
  protected readonly selectClass = SELECT_CLASS;

  /**
   * linkedSignal : calculé à partir de l'input (comme un computed), MAIS modifiable ensuite
   * (comme un signal) : c'est ce que le formulaire écrit à chaque frappe.
   */
  protected readonly model = linkedSignal(() => toModel(this.article()));

  protected readonly articleForm = form(this.model, (path) => {
    // Code et unité : saisis à la création seulement, définitifs ensuite
    hidden(path.code, { when: () => this.isEdit() });
    hidden(path.unitCode, { when: () => this.isEdit() });
    applyWhen(
      path.code,
      () => !this.isEdit(),
      (code) => {
        required(code, { message: 'Indique un code' });
        maxLength(code, 50, { message: '50 caractères au maximum' });
        pattern(code, /^[A-Za-z0-9_-]+$/, { message: 'Lettres, chiffres, - et _ uniquement, sans espace' });
      },
    );

    required(path.label, { message: 'Indique un libellé' });
    maxLength(path.label, 200, { message: '200 caractères au maximum' });
    required(path.categoryCode, { message: 'Choisis une catégorie' });
    maxLength(path.supplierReference, 100, { message: '100 caractères au maximum' });
    min(path.alertThreshold, 0, { message: 'Le seuil ne peut pas être négatif' });
  });

  // ---------- Les listes de choix ----------

  private readonly categories = httpResource<CategoryRow[]>(() => '/api/referentiel/categories');
  protected readonly units = httpResource<UnitRow[]>(() => '/api/referentiel/units');
  private readonly suppliers = httpResource<Page<SupplierRow>>(() => ({
    url: '/api/referentiel/suppliers',
    params: { kind: 'DRY_GOODS', size: 200, sort: 'name' },
  }));

  /** Les catégories actives, plus celle de l'article même si elle a été archivée depuis. */
  protected readonly categoryOptions = computed(() =>
    (this.categories.hasValue() ? this.categories.value() : []).filter(
      (category) => category.active || category.code === this.article()?.categoryCode,
    ),
  );

  protected readonly supplierOptions = computed(() =>
    (this.suppliers.hasValue() ? this.suppliers.value().content : []).filter(
      (supplier) => supplier.active || supplier.id === this.article()?.mainSupplierId,
    ),
  );

  protected readonly selectedCategory = computed(() =>
    this.categoryOptions().find((category) => category.code === this.articleForm.categoryCode().value()),
  );

  // ---------- Enregistrement ----------

  protected async save(): Promise<void> {
    await submit(this.articleForm, {
      action: async () => {
        const value = this.model();
        const fields = {
          label: value.label.trim(),
          categoryCode: value.categoryCode,
          mainSupplierId: value.mainSupplierId || null,
          supplierReference: value.supplierReference.trim() || null,
          alertThreshold: value.alertThreshold,
        };
        try {
          const article = this.article();
          const saved = article
            ? await this.api.updateArticle(article.id, fields)
            : await this.api.createArticle({ ...fields, code: value.code.trim(), unitCode: value.unitCode || null });
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          // "Code déjà utilisé", "a déjà des lots ou du stock…" : affiché sur le formulaire
          return { fieldTree: this.articleForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
