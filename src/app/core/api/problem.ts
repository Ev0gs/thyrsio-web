import { HttpErrorResponse } from '@angular/common/http';

/** Le format d'erreur de l'API (ProblemDetail, renvoyé par GlobalExceptionHandler). */
interface ProblemDetail {
  status?: number;
  detail?: string;
  /** Les erreurs de validation des champs : { "quantity": "doit être supérieur à 0" } */
  errors?: Record<string, string>;
}

/** Le message à montrer à l'utilisateur, quelle que soit l'erreur reçue. */
export function problemMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Une erreur inattendue est survenue.';
  }
  if (error.status === 0) {
    return "L'API ne répond pas : vérifie qu'elle est démarrée.";
  }
  const problem = error.error as ProblemDetail | null;
  if (problem?.errors) {
    return Object.values(problem.errors).join(' · ');
  }
  return problem?.detail ?? `Erreur ${error.status}`;
}
