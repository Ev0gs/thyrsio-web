import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GenerateGtinRequest, Gs1Prefix, Gtin, RecordGtinRequest } from './gs1.models';

/** Les écritures des gencodes. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class Gs1Api {
  private readonly http = inject(HttpClient);

  createPrefix(prefix: string, label: string | null): Promise<Gs1Prefix> {
    return firstValueFrom(this.http.post<Gs1Prefix>('/api/gs1/prefixes', { prefix, label }));
  }

  updatePrefix(prefix: Gs1Prefix, label: string | null, active: boolean): Promise<Gs1Prefix> {
    return firstValueFrom(
      this.http.put<Gs1Prefix>(`/api/gs1/prefixes/${prefix.id}`, {
        prefix: prefix.prefix,
        label,
        active,
      }),
    );
  }

  generate(request: GenerateGtinRequest): Promise<Gtin> {
    return firstValueFrom(this.http.post<Gtin>('/api/gs1/gtins/generate', request));
  }

  record(request: RecordGtinRequest): Promise<Gtin> {
    return firstValueFrom(this.http.post<Gtin>('/api/gs1/gtins', request));
  }

  describe(id: string, description: string | null, notes: string | null): Promise<Gtin> {
    return firstValueFrom(this.http.put<Gtin>(`/api/gs1/gtins/${id}`, { description, notes }));
  }

  retire(id: string): Promise<Gtin> {
    return firstValueFrom(this.http.post<Gtin>(`/api/gs1/gtins/${id}/retire`, null));
  }
}
