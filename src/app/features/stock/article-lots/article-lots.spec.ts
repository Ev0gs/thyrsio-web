import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ArticleLots } from './article-lots';

describe('ArticleLots', () => {
  it('loads the lots of the article and lists them', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(ArticleLots);
    fixture.componentRef.setInput('articleId', 'article-1');
    fixture.componentRef.setInput('unitCode', 'U');
    TestBed.tick(); // laisse httpResource envoyer sa requête

    // Le test intercepte la requête, vérifie ses paramètres et choisit la réponse
    const request = http.expectOne((r) => r.url === '/api/stock/balances');
    expect(request.request.params.get('articleId')).toBe('article-1');
    request.flush({
      content: [
        { lotId: 'lot-1', lotNumber: '24-117', quantity: 1200, updatedAt: '2026-11-09T10:00:00Z' },
      ],
      page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
    });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('24-117');
    http.verify(); // aucune autre requête inattendue
  });
});
