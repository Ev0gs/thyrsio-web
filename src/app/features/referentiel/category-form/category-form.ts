import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  applyWhen,
  form,
  FormField,
  hidden,
  maxLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { ReferentielApi } from '../referentiel-api';
import { CategoryRow, UnitRow } from '../referentiel.models';

interface CategoryModel {
  code: string;
  label: string;
  defaultUnitCode: string;
  regulated: boolean;
}

const toModel = (category: CategoryRow | null): CategoryModel => ({
  code: category?.code ?? '',
  label: category?.label ?? '',
  defaultUnitCode: category?.defaultUnitCode ?? 'U',
  regulated: category?.regulated ?? false,
});

/**
 * Créer ou modifier une catégorie d'article (Bouchon, Capsule CRD…).
 * Pas de balise <form> : le formulaire peut s'afficher à l'intérieur de celui d'un article.
 * Entrée dans un champ enregistre la catégorie, sans envoyer le formulaire qui l'entoure.
 */
@Component({
  selector: 'app-category-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmInputImports],
  templateUrl: './category-form.html',
})
export class CategoryForm {
  /** null : nouvelle catégorie ; une catégorie : modification (le code est définitif). */
  readonly category = input<CategoryRow | null>(null);
  readonly saved = output<CategoryRow>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly isEdit = computed(() => this.category() !== null);
  protected readonly selectClass = SELECT_CLASS;
  protected readonly units = httpResource<UnitRow[]>(() => '/api/referentiel/units');

  protected readonly model = linkedSignal(() => toModel(this.category()));

  protected readonly categoryForm = form(this.model, (path) => {
    hidden(path.code, { when: () => this.isEdit() });
    applyWhen(
      path.code,
      () => !this.isEdit(),
      (code) => {
        required(code, { message: 'Indique un code' });
        maxLength(code, 50, { message: '50 caractères au maximum' });
        pattern(code, /^[A-Za-z0-9_-]+$/, {
          message: 'Lettres, chiffres, - et _ uniquement, sans espace',
        });
      },
    );
    required(path.label, { message: 'Indique un libellé' });
    maxLength(path.label, 100, { message: '100 caractères au maximum' });
    required(path.defaultUnitCode, { message: "Choisis l'unité" });
  });

  /** Entrée : enregistre la catégorie, sans soumettre un éventuel formulaire parent. */
  protected onEnter(event: Event): void {
    event.preventDefault();
    void this.save();
  }

  protected async save(): Promise<void> {
    await submit(this.categoryForm, {
      action: async () => {
        const value = this.model();
        const fields = {
          label: value.label.trim(),
          defaultUnitCode: value.defaultUnitCode,
          regulated: value.regulated,
        };
        try {
          const current = this.category();
          const saved = current
            ? await this.api.updateCategory(current.id, fields)
            : await this.api.createCategory({ ...fields, code: value.code.trim() });
          this.saved.emit(saved);
          return undefined;
        } catch (error) {
          // « Code déjà utilisé »… : affiché ici
          return { fieldTree: this.categoryForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
