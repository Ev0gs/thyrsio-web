import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import {
  applyWhen,
  email,
  form,
  FormField,
  hidden,
  maxLength,
  pattern,
  required,
  submit,
} from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import {
  COMMON_COUNTRIES,
  COMMON_LANGUAGES,
  countryName,
  languageName,
} from '../../../core/i18n/countries';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { ReferentielApi } from '../referentiel-api';
import { ClientRow, Incoterm, INCOTERMS } from '../referentiel.models';

const toModel = (client: ClientRow | null) => ({
  code: client?.code ?? '',
  name: client?.name ?? '',
  countryCode: client?.countryCode ?? 'FR',
  language: client?.language ?? 'fr',
  addressLine1: client?.addressLine1 ?? '',
  addressLine2: client?.addressLine2 ?? '',
  postalCode: client?.postalCode ?? '',
  city: client?.city ?? '',
  email: client?.email ?? '',
  phone: client?.phone ?? '',
  vatNumber: client?.vatNumber ?? '',
  exciseNumber: client?.exciseNumber ?? '',
  defaultIncoterm: (client?.defaultIncoterm ?? '') as Incoterm | '',
  gs1LabelingRequired: client?.gs1LabelingRequired ?? false,
  notes: client?.notes ?? '',
});

/** "" → null : l'API attend null pour un champ facultatif non rempli. */
const orNull = (text: string) => text.trim() || null;

@Component({
  selector: 'app-client-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './client-form.html',
})
export class ClientForm {
  /** null : création ; un client : modification. */
  readonly client = input<ClientRow | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly incoterms = INCOTERMS;
  protected readonly isEdit = computed(() => this.client() !== null);

  /** Les pays et langues habituels, plus ceux du client s'il en a un autre (l'API les accepte tous). */
  protected readonly countries = computed(() => {
    const current = this.client()?.countryCode;
    return current && !COMMON_COUNTRIES.some((c) => c.code === current)
      ? [{ code: current, name: countryName(current) }, ...COMMON_COUNTRIES]
      : COMMON_COUNTRIES;
  });
  protected readonly languages = computed(() => {
    const current = this.client()?.language;
    return current && !COMMON_LANGUAGES.some((l) => l.code === current)
      ? [{ code: current, name: languageName(current) }, ...COMMON_LANGUAGES]
      : COMMON_LANGUAGES;
  });

  protected readonly model = linkedSignal(() => toModel(this.client()));

  protected readonly clientForm = form(this.model, (path) => {
    hidden(path.code, { when: () => this.isEdit() });
    applyWhen(
      path.code,
      () => !this.isEdit(),
      (code) => {
        required(code, { message: 'Indique un code client' });
        maxLength(code, 50, { message: '50 caractères au maximum' });
        pattern(code, /^[A-Za-z0-9_-]+$/, {
          message: 'Lettres, chiffres, - et _ uniquement, sans espace',
        });
      },
    );
    required(path.name, { message: 'Indique la raison sociale' });
    maxLength(path.name, 200, { message: '200 caractères au maximum' });
    required(path.countryCode, { message: 'Choisis un pays' });
    email(path.email, { message: 'Adresse e-mail invalide' });
    maxLength(path.vatNumber, 20, { message: '20 caractères au maximum' });
    maxLength(path.exciseNumber, 20, { message: '20 caractères au maximum' });
    maxLength(path.notes, 2000, { message: '2 000 caractères au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.clientForm, {
      action: async () => {
        const value = this.model();
        const fields = {
          name: value.name.trim(),
          countryCode: value.countryCode,
          language: value.language,
          addressLine1: orNull(value.addressLine1),
          addressLine2: orNull(value.addressLine2),
          postalCode: orNull(value.postalCode),
          city: orNull(value.city),
          email: orNull(value.email),
          phone: orNull(value.phone),
          vatNumber: orNull(value.vatNumber), // l'API retire espaces et points, et met en majuscules
          exciseNumber: orNull(value.exciseNumber),
          defaultIncoterm: value.defaultIncoterm || null,
          gs1LabelingRequired: value.gs1LabelingRequired,
          notes: orNull(value.notes),
        };
        try {
          const client = this.client();
          await (client
            ? this.api.updateClient(client.id, fields)
            : this.api.createClient({ ...fields, code: value.code.trim() }));
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.clientForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
