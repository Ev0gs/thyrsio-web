import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  applyEach,
  form,
  FormField,
  max,
  maxLength,
  min,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { Page } from '../../../core/api/page';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { SupplierRow } from '../../referentiel/referentiel.models';
import { CuverieApi } from '../cuverie-api';
import {
  roundHl,
  Tank,
  WINE_COLOR_LABELS,
  WINE_COLORS,
  WineColor,
  WineLot,
} from '../cuverie.models';

interface FillModel {
  tankId: string;
  volumeHl: number | null;
}

interface ReceptionModel {
  supplierId: string;
  appellation: string;
  color: WineColor;
  vintage: number | null;
  alcohol: number | null;
  supplierLotNumber: string;
  daeNumber: string;
  pricePerHl: number | null;
  receivedOn: string;
  notes: string;
  fills: FillModel[];
}

const emptyFill = (): FillModel => ({ tankId: '', volumeHl: null });

/** Un nombre avec au plus 2 décimales (hl au litre près, prix au centime). */
const hasTwoDecimalsAtMost = (value: number) => Math.round(value * 100) === value * 100;

/**
 * Un camion-citerne arrive : la fiche du vin, puis la ou les cuves remplies.
 * Un seul enregistrement crée le lot et remplit toutes les cuves (tout ou rien).
 */
@Component({
  selector: 'app-reception-form',
  imports: [
    DecimalPipe,
    RouterLink,
    NgIcon,
    FormField,
    FieldError,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2 })],
  templateUrl: './reception-form.html',
})
export class ReceptionForm {
  /** Les cuves de l'écran, déjà chargées : seules les cuves vides et en service sont proposées. */
  readonly tanks = input.required<Tank[]>();
  readonly saved = output<WineLot>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly colors = WINE_COLORS;
  protected readonly colorLabels = WINE_COLOR_LABELS;

  /** Seuls les fournisseurs de vin, actifs. */
  protected readonly suppliers = httpResource<Page<SupplierRow>>(() => ({
    url: '/api/referentiel/suppliers',
    params: { kind: 'WINE', size: 200, sort: 'name' },
  }));

  protected readonly supplierOptions = computed(() =>
    this.suppliers.hasValue() ? this.suppliers.value().content : [],
  );

  protected readonly emptyTanks = computed(() =>
    this.tanks().filter((tank) => tank.active && tank.state === 'EMPTY'),
  );

  private readonly tanksById = computed(() => new Map(this.tanks().map((tank) => [tank.id, tank])));

  protected readonly model = signal<ReceptionModel>({
    supplierId: '',
    appellation: '',
    color: 'RED',
    vintage: null,
    alcohol: null,
    supplierLotNumber: '',
    daeNumber: '',
    pricePerHl: null,
    receivedOn: todayLocal(),
    notes: '',
    fills: [emptyFill()],
  });

  protected readonly receptionForm = form(this.model, (path) => {
    required(path.supplierId, { message: 'Choisis le fournisseur' });
    required(path.appellation, { message: "Indique l'appellation" });
    maxLength(path.appellation, 200, { message: '200 caractères au maximum' });
    min(path.vintage, 1900, { message: 'Millésime invalide' });
    max(path.vintage, 2100, { message: 'Millésime invalide' });
    min(path.alcohol, 0, { message: 'Degré invalide' });
    max(path.alcohol, 25, { message: 'Degré invalide' });
    min(path.pricePerHl, 0, { message: 'Le prix ne peut pas être négatif' });
    maxLength(path.supplierLotNumber, 100, { message: '100 caractères au maximum' });
    maxLength(path.daeNumber, 100, { message: '100 caractères au maximum' });
    required(path.receivedOn, { message: 'Indique la date de réception' });
    validate(path.receivedOn, ({ value }) =>
      value() > todayLocal()
        ? { kind: 'future', message: 'La date ne peut pas être dans le futur' }
        : undefined,
    );

    // Chaque ligne de remplissage : une cuve, un volume qui tient dans la cuve
    applyEach(path.fills, (fill) => {
      required(fill.tankId, { message: 'Choisis une cuve' });
      required(fill.volumeHl, { message: 'Indique le volume' });
      validate(fill.tankId, ({ value, valueOf }) => {
        const tankId = value();
        const duplicates = valueOf(path.fills).filter((other) => other.tankId === tankId).length;
        return tankId && duplicates > 1
          ? { kind: 'duplicate', message: 'Cette cuve est déjà choisie plus haut' }
          : undefined;
      });
      validate(fill.volumeHl, ({ value, valueOf }) => {
        const volume = value();
        if (volume === null) {
          return undefined;
        }
        if (volume <= 0) {
          return { kind: 'positive', message: 'Le volume doit être positif' };
        }
        if (!hasTwoDecimalsAtMost(volume)) {
          return { kind: 'decimals', message: '2 décimales au maximum' };
        }
        const tank = this.tanksById().get(valueOf(fill.tankId));
        return tank && volume > tank.freeSpaceHl
          ? {
              kind: 'capacity',
              message: `La cuve ${tank.code} n'accepte que ${tank.freeSpaceHl} hl`,
            }
          : undefined;
      });
    });
  });

  protected readonly totalHl = computed(() =>
    roundHl(this.model().fills.reduce((sum, fill) => sum + (fill.volumeHl ?? 0), 0)),
  );

  protected tankFor(tankId: string): Tank | undefined {
    return this.tanksById().get(tankId);
  }

  protected addFill(): void {
    this.model.update((model) => ({ ...model, fills: [...model.fills, emptyFill()] }));
  }

  protected removeFill(index: number): void {
    this.model.update((model) => ({ ...model, fills: model.fills.filter((_, i) => i !== index) }));
  }

  /** Remplit la cuve au maximum : le cas le plus courant quand le camion répartit le vin. */
  protected fillTank(index: number): void {
    const tank = this.tankFor(this.model().fills[index]?.tankId ?? '');
    if (tank) {
      this.receptionForm.fills[index]?.volumeHl().value.set(tank.freeSpaceHl);
    }
  }

  protected async save(): Promise<void> {
    await submit(this.receptionForm, {
      action: async () => {
        const value = this.model();
        try {
          const lot = await this.api.receive({
            supplierId: value.supplierId,
            appellation: value.appellation.trim(),
            color: value.color,
            vintage: value.vintage,
            alcohol: value.alcohol,
            supplierLotNumber: value.supplierLotNumber.trim() || null,
            daeNumber: value.daeNumber.trim() || null,
            pricePerHl: value.pricePerHl,
            receivedAt: toInstant(value.receivedOn),
            notes: value.notes.trim() || null,
            fills: value.fills.map((fill) => ({ tankId: fill.tankId, volumeHl: fill.volumeHl! })),
          });
          this.saved.emit(lot);
          return undefined;
        } catch (error) {
          // "Capacité dépassée…", "La cuve C03 est en nettoyage…" : affiché sur le formulaire
          return { fieldTree: this.receptionForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
