import { Component, input } from '@angular/core';

/** Page provisoire : le titre vient des "data" de la route (withComponentInputBinding). */
@Component({
  selector: 'app-placeholder',
  template: `
    <header class="flex flex-col gap-1">
      <h1 class="text-[28px] font-semibold tracking-tight">{{ heading() }}</h1>
      <p class="text-sm text-muted-foreground">Écran en construction</p>
    </header>
    <div
      class="mt-6 flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
    >
      Bientôt branché sur l'API
    </div>
  `,
})
export class Placeholder {
  readonly heading = input('Thyrsio');
}
