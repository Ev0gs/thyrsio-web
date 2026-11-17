import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import { email, form, FormField, maxLength, pattern, submit } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideRotateCw } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { firstValueFrom } from 'rxjs';
import { problemMessage } from '../../../core/api/problem';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { PageIcon } from '../../../shared/ui/page-icon/page-icon';
import { CompanySettings, CompanySettingsRequest } from '../registre.models';

interface CompanyModel {
  legalName: string;
  exciseNumber: string;
  siret: string;
  vatNumber: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone: string;
  email: string;
  registerStartDate: string;
}

const toModel = (s: CompanySettings | null): CompanyModel => ({
  legalName: s?.legalName ?? '',
  exciseNumber: s?.exciseNumber ?? '',
  siret: s?.siret ?? '',
  vatNumber: s?.vatNumber ?? '',
  addressLine1: s?.addressLine1 ?? '',
  addressLine2: s?.addressLine2 ?? '',
  postalCode: s?.postalCode ?? '',
  city: s?.city ?? '',
  countryCode: s?.countryCode ?? 'FR',
  phone: s?.phone ?? '',
  email: s?.email ?? '',
  registerStartDate: s?.registerStartDate ?? '',
});

const orNull = (value: string): string | null => value.trim() || null;

/**
 * La fiche de l'entreprise : raison sociale, n° d'accise, adresse.
 * Elle figure en page de garde des registres imprimés (cahier de chai, conditionnement).
 */
@Component({
  selector: 'app-company-settings',
  imports: [
    PageIcon,
    DatePipe,
    NgIcon,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
  ],
  viewProviders: [provideIcons({ lucideCheck, lucideRotateCw })],
  templateUrl: './company-settings.html',
})
export class CompanySettingsPage {
  private readonly http = inject(HttpClient);

  protected readonly settings = httpResource<CompanySettings>(() => '/api/company');
  protected readonly model = signal<CompanyModel>(toModel(null));
  protected readonly savedAt = signal<string | null>(null);

  protected readonly companyForm = form(this.model, (path) => {
    maxLength(path.legalName, 200, { message: '200 caractères au maximum' });
    // FR + 11 caractères : FR010926E2586 (espaces tolérés, l'API les retire)
    pattern(path.exciseNumber, /^\s*$|^[A-Za-z]{2}[\s0-9A-Za-z]{9,16}$/, {
      message: "Un n° d'accise ressemble à FR010926E2586",
    });
    pattern(path.siret, /^\s*$|^[\d\s]{14,17}$/, { message: 'Un SIRET compte 14 chiffres' });
    maxLength(path.vatNumber, 20, { message: '20 caractères au maximum' });
    maxLength(path.addressLine1, 200, { message: '200 caractères au maximum' });
    maxLength(path.addressLine2, 200, { message: '200 caractères au maximum' });
    maxLength(path.postalCode, 20, { message: '20 caractères au maximum' });
    maxLength(path.city, 100, { message: '100 caractères au maximum' });
    pattern(path.countryCode, /^[A-Za-z]{2}$/, { message: 'Code pays à 2 lettres (FR, BE…)' });
    maxLength(path.phone, 30, { message: '30 caractères au maximum' });
    email(path.email, { message: 'Adresse e-mail invalide' });
  });

  constructor() {
    // La fiche chargée remplit le formulaire
    effect(() => {
      if (this.settings.hasValue()) {
        this.model.set(toModel(this.settings.value()));
      }
    });
  }

  protected async save(event?: Event): Promise<void> {
    event?.preventDefault();
    this.savedAt.set(null);
    await submit(this.companyForm, {
      action: async () => {
        const v = this.model();
        const request: CompanySettingsRequest = {
          legalName: orNull(v.legalName),
          exciseNumber: orNull(v.exciseNumber),
          siret: orNull(v.siret),
          vatNumber: orNull(v.vatNumber),
          addressLine1: orNull(v.addressLine1),
          addressLine2: orNull(v.addressLine2),
          postalCode: orNull(v.postalCode),
          city: orNull(v.city),
          countryCode: v.countryCode.trim().toUpperCase() || 'FR',
          phone: orNull(v.phone),
          email: orNull(v.email),
          registerStartDate: v.registerStartDate || null,
        };
        try {
          const saved = await firstValueFrom(
            this.http.put<CompanySettings>('/api/company', request),
          );
          // L'API normalise (n° d'accise en majuscules, sans espace) : on reprend sa version
          this.settings.set(saved);
          this.savedAt.set(saved.updatedAt);
          return undefined;
        } catch (error) {
          return { fieldTree: this.companyForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
