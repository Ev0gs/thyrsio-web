import { Component, input } from '@angular/core';

/** Ce dont le composant a besoin : l'état d'un champ Signal Forms y correspond. */
interface FieldStateLike {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { message?: string }[];
}

/** Le premier message d'erreur d'un champ, une fois qu'on l'a touché. Usage : [state]="monForm.nom()" */
@Component({
  selector: 'app-field-error',
  template: `
    @if (state().touched() && state().invalid()) {
      <p class="text-sm text-destructive">{{ state().errors()[0]?.message }}</p>
    }
  `,
})
export class FieldError {
  readonly state = input.required<FieldStateLike>();
}
