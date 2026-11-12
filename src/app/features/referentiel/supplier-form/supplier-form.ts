import { Component, inject, input, linkedSignal, output } from '@angular/core';
import {
  email,
  form,
  FormField,
  max,
  maxLength,
  min,
  required,
  submit,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { ReferentielApi } from '../referentiel-api';
import { SUPPLIER_KIND_LABELS, SupplierDetail, SupplierKind } from '../referentiel.models';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';

const toModel = (supplier: SupplierDetail | null) => ({
  name: supplier?.name ?? '',
  kind: supplier?.kind ?? ('DRY_GOODS' as SupplierKind),
  email: supplier?.email ?? '',
  phone: supplier?.phone ?? '',
  address: supplier?.address ?? '',
  averageLeadTimeDays: supplier?.averageLeadTimeDays ?? (null as number | null),
});

@Component({
  selector: 'app-supplier-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './supplier-form.html',
})
export class SupplierForm {
  /** null : création ; un fournisseur : modification. */
  readonly supplier = input<SupplierDetail | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly kindLabels = SUPPLIER_KIND_LABELS;
  protected readonly kinds = Object.keys(SUPPLIER_KIND_LABELS) as SupplierKind[];

  protected readonly model = linkedSignal(() => toModel(this.supplier()));

  protected readonly supplierForm = form(this.model, (path) => {
    required(path.name, { message: 'Indique le nom du fournisseur' });
    maxLength(path.name, 200, { message: '200 caractères au maximum' });
    email(path.email, { message: 'Adresse e-mail invalide' });
    maxLength(path.phone, 30, { message: '30 caractères au maximum' });
    maxLength(path.address, 500, { message: '500 caractères au maximum' });
    min(path.averageLeadTimeDays, 0, { message: 'Un délai ne peut pas être négatif' });
    max(path.averageLeadTimeDays, 365, { message: '365 jours au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.supplierForm, {
      action: async () => {
        const value = this.model();
        const request = {
          name: value.name.trim(),
          kind: value.kind,
          email: value.email.trim() || null,
          phone: value.phone.trim() || null,
          address: value.address.trim() || null,
          averageLeadTimeDays: value.averageLeadTimeDays,
        };
        try {
          const supplier = this.supplier();
          await (supplier
            ? this.api.updateSupplier(supplier.id, request)
            : this.api.createSupplier(request));
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.supplierForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
