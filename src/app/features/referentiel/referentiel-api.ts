import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ArticleRow, CreateArticleRequest, UpdateArticleRequest } from './referentiel.models';

/** Les écritures du référentiel. Les lectures passent par httpResource dans les composants. */
@Injectable({ providedIn: 'root' })
export class ReferentielApi {
  private readonly http = inject(HttpClient);
  private readonly articlesUrl = '/api/referentiel/articles';

  createArticle(request: CreateArticleRequest): Promise<ArticleRow> {
    return firstValueFrom(this.http.post<ArticleRow>(this.articlesUrl, request));
  }

  updateArticle(id: string, request: UpdateArticleRequest): Promise<ArticleRow> {
    return firstValueFrom(this.http.put<ArticleRow>(`${this.articlesUrl}/${id}`, request));
  }

  /** Archive ou réactive : deux routes POST côté API, ni DELETE ni PUT. */
  setArticleActive(id: string, active: boolean): Promise<void> {
    const action = active ? 'reactivate' : 'archive';
    return firstValueFrom(this.http.post<void>(`${this.articlesUrl}/${id}/${action}`, null));
  }
}
