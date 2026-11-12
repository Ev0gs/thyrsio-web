import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, hidden, required, submit, validate } from '@angular/forms/signals';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { problemMessage } from '../../../core/api/problem';
import { todayLocal, toInstant } from '../../../core/dates';
import { FieldError } from '../../../shared/ui/field-error/field-error';
import { SELECT_CLASS } from '../../../shared/ui/form-styles';
import { CuverieApi } from '../cuverie-api';
import { describeWine, roundHl, Tank } from '../cuverie.models';
import { WineLabel } from '../wine-label/wine-label';

type TransferMode = 'partial' | 'all';

interface TransferModel {
  sourceTankId: string;
  destinationTankId: string;
  mode: TransferMode;
  volumeHl: number | null;
  lossHl: number | null;
  occurredOn: string;
  notes: string;
}

const hasTwoDecimalsAtMost = (value: number) => Math.round(value * 100) === value * 100;

/**
 * Soutirage ou transfert : du vin passe d'une cuve à une autre, avec une perte éventuelle.
 * La destination doit être vide ou contenir déjà le même vin.
 */
@Component({
  selector: 'app-transfer-form',
  imports: [
    DecimalPipe,
    FormField,
    FieldError,
    WineLabel,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
  ],
  templateUrl: './transfer-form.html',
})
export class TransferForm {
  readonly tanks = input.required<Tank[]>();
  /** Facultatif : la cuve d'origine, quand on transfère depuis la fiche d'une cuve. */
  readonly sourceTankId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  private readonly api = inject(CuverieApi);

  protected readonly selectClass = SELECT_CLASS;
  protected readonly describeWine = describeWine;

  protected readonly model = linkedSignal<TransferModel>(() => ({
    sourceTankId: this.sourceTankId() ?? '',
    destinationTankId: '',
    mode: 'partial',
    volumeHl: null,
    lossHl: null,
    occurredOn: todayLocal(),
    notes: '',
  }));

  private readonly tanksById = computed(() => new Map(this.tanks().map((tank) => [tank.id, tank])));

  /** Les cuves qu'on peut vider : celles qui contiennent du vin. */
  protected readonly sourceOptions = computed(() =>
    this.tanks().filter((tank) => tank.volumeHl > 0),
  );

  protected readonly source = computed(() =>
    this.tanksById().get(this.transferForm.sourceTankId().value()),
  );
  protected readonly destination = computed(() =>
    this.tanksById().get(this.transferForm.destinationTankId().value()),
  );

  /** Les destinations possibles : en service, vides ou contenant déjà le même vin. */
  protected readonly destinationOptions = computed(() => {
    const source = this.source();
    if (!source?.wineLot) {
      return [];
    }
    return this.tanks().filter(
      (tank) =>
        tank.id !== source.id &&
        tank.active &&
        tank.status === 'IN_SERVICE' &&
        tank.freeSpaceHl > 0 &&
        (tank.wineLot === null || tank.wineLot.id === source.wineLot!.id),
    );
  });

  /** Ce qui arrivera dans la destination : saisi, ou tout le contenu de la source moins la perte. */
  protected readonly arrivingHl = computed(() => {
    const value = this.model();
    const source = this.source();
    if (value.mode === 'all') {
      return source ? roundHl(source.volumeHl - (value.lossHl ?? 0)) : 0;
    }
    return value.volumeHl ?? 0;
  });

  protected readonly leftInSourceHl = computed(() => {
    const source = this.source();
    if (!source) {
      return 0;
    }
    const value = this.model();
    return value.mode === 'all'
      ? 0
      : roundHl(source.volumeHl - this.arrivingHl() - (value.lossHl ?? 0));
  });

  protected readonly transferForm = form(this.model, (path) => {
    required(path.sourceTankId, { message: "Choisis la cuve d'origine" });
    required(path.destinationTankId, { message: 'Choisis la cuve de destination' });
    hidden(path.volumeHl, { when: ({ valueOf }) => valueOf(path.mode) === 'all' });
    required(path.volumeHl, {
      message: 'Indique le volume transféré',
      when: ({ valueOf }) => valueOf(path.mode) === 'partial',
    });
    required(path.occurredOn, { message: 'Indique la date' });
    validate(path.occurredOn, ({ value }) =>
      value() > todayLocal()
        ? { kind: 'future', message: 'La date ne peut pas être dans le futur' }
        : undefined,
    );

    validate(path.volumeHl, ({ value, valueOf }) => {
      const volume = value();
      if (volume === null || valueOf(path.mode) === 'all') {
        return undefined;
      }
      if (volume <= 0) {
        return { kind: 'positive', message: 'Le volume doit être positif' };
      }
      if (!hasTwoDecimalsAtMost(volume)) {
        return { kind: 'decimals', message: '2 décimales au maximum' };
      }
      const source = this.tanksById().get(valueOf(path.sourceTankId));
      const loss = valueOf(path.lossHl) ?? 0;
      return source && volume + loss > source.volumeHl
        ? {
            kind: 'source',
            message: `La cuve ${source.code} ne contient que ${source.volumeHl} hl (perte comprise)`,
          }
        : undefined;
    });

    validate(path.lossHl, ({ value, valueOf }) => {
      const loss = value();
      if (loss === null) {
        return undefined;
      }
      if (loss < 0) {
        return { kind: 'negative', message: 'La perte ne peut pas être négative' };
      }
      if (!hasTwoDecimalsAtMost(loss)) {
        return { kind: 'decimals', message: '2 décimales au maximum' };
      }
      const source = this.tanksById().get(valueOf(path.sourceTankId));
      return source && valueOf(path.mode) === 'all' && loss >= source.volumeHl
        ? { kind: 'tooLarge', message: 'La perte dépasse le contenu de la cuve' }
        : undefined;
    });

    // La destination doit pouvoir accueillir ce qui arrive
    validate(path.destinationTankId, ({ value }) => {
      const destination = this.tanksById().get(value());
      const arriving = this.arrivingHl();
      return destination && arriving > destination.freeSpaceHl
        ? {
            kind: 'capacity',
            message: `La cuve ${destination.code} n'a que ${destination.freeSpaceHl} hl de place`,
          }
        : undefined;
    });
  });

  constructor() {
    // Changer de cuve d'origine vide la destination : elle n'est peut-être plus compatible
    effect(() => {
      this.transferForm.sourceTankId().value();
      untracked(() => this.transferForm.destinationTankId().value.set(''));
    });
  }

  protected setMode(mode: TransferMode): void {
    this.transferForm.mode().value.set(mode);
  }

  protected async save(): Promise<void> {
    await submit(this.transferForm, {
      action: async () => {
        const value = this.model();
        try {
          await this.api.transfer({
            sourceTankId: value.sourceTankId,
            destinationTankId: value.destinationTankId,
            volumeHl: value.mode === 'all' ? null : value.volumeHl,
            lossHl: value.lossHl,
            emptySource: value.mode === 'all',
            occurredAt: toInstant(value.occurredOn),
            notes: value.notes.trim() || null,
          });
          this.saved.emit();
          return undefined;
        } catch (error) {
          return { fieldTree: this.transferForm, kind: 'server', message: problemMessage(error) };
        }
      },
    });
  }
}
