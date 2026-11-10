import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { COMMON_COUNTRIES, countryName } from '../../../core/i18n/countries';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { ReferentielApi } from '../referentiel-api';
import { DeliveryAddress } from '../referentiel.models';

function toModel(address: DeliveryAddress | null, defaultCountry: string) {
  return {
    label: address?.label ?? '',
    recipientName: address?.recipientName ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    postalCode: address?.postalCode ?? '',
    city: address?.city ?? '',
    countryCode: address?.countryCode ?? defaultCountry,
    phone: address?.phone ?? '',
    deliveryInstructions: address?.deliveryInstructions ?? '',
    defaultAddress: address?.defaultAddress ?? false,
  };
}

const orNull = (text: string) => text.trim() || null;

@Component({
  selector: 'app-address-form',
  imports: [FormField, FieldError, HlmButtonImports, HlmDialogImports, HlmInputImports],
  templateUrl: './address-form.html',
})
export class AddressForm {
  readonly clientId = input.required<string>();
  /** null : création ; une adresse : modification. */
  readonly address = input<DeliveryAddress | null>(null);
  /** Le pays proposé pour une nouvelle adresse : celui du client. */
  readonly defaultCountry = input('FR');
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(ReferentielApi);

  protected readonly selectClass = SELECT_CLASS;

  protected readonly countries = computed(() => {
    const current = this.address()?.countryCode ?? this.defaultCountry();
    return COMMON_COUNTRIES.some((c) => c.code === current)
      ? COMMON_COUNTRIES
      : [{ code: current, name: countryName(current) }, ...COMMON_COUNTRIES];
  });

  protected readonly model = linkedSignal(() => toModel(this.address(), this.defaultCountry()));

  protected readonly addressForm = form(this.model, (path) => {
    required(path.label, { message: 'Donne un nom à cette adresse (ex. « Entrepôt Yokohama »)' });
    maxLength(path.label, 100, { message: '100 caractères au maximum' });
    required(path.addressLine1, { message: "Indique l'adresse" });
    maxLength(path.addressLine1, 200, { message: '200 caractères au maximum' });
    required(path.city, { message: 'Indique la ville' });
    maxLength(path.postalCode, 20, { message: '20 caractères au maximum' });
    required(path.countryCode, { message: 'Choisis un pays' });
    maxLength(path.deliveryInstructions, 1000, { message: '1 000 caractères au maximum' });
  });

  protected async save(): Promise<void> {
    await submit(this.addressForm, {
      action: async () => {
        const value = this.model();
        const request = {
          label: value.label.trim(),
          recipientName: orNull(value.recipientName),
          addressLine1: value.addressLine1.trim(),
          addressLine2: orNull(value.addressLine2),
          postalCode: orNull(value.postalCode), // facultatif : certains pays n'en ont pas
          city: value.city.trim(),
          countryCode: value.countryCode,
          phone: orNull(value.phone),
          deliveryInstructions: orNull(value.deliveryInstructions),
          defaultAddress: value.defaultAddress,
        };
        try {
          const address = this.address();
          await (address
            ? this.api.updateAddress(this.clientId(), address.id, request)
            : this.api.createAddress(this.clientId(), request));
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.addressForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
