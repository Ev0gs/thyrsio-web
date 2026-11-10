import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ArticleRow } from '../referentiel.models';
import { ArticleForm } from './article-form';

const existing: ArticleRow = {
  id: 'a1',
  code: 'BCH-LIE-4924',
  label: 'Bouchon liège naturel 49×24',
  categoryCode: 'BOUCHON',
  categoryLabel: 'Bouchon',
  lotTracked: true,
  unitCode: 'U',
  mainSupplierId: null,
  mainSupplierName: null,
  supplierReference: null,
  alertThreshold: 5000,
  active: true,
  createdAt: '2026-11-01T10:00:00Z',
};

describe('ArticleForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('asks for a code when creating an article', () => {
    const fixture = TestBed.createComponent(ArticleForm);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#art-code')).toBeTruthy();
  });

  it('pre-fills the form and hides the code when editing', () => {
    const fixture = TestBed.createComponent(ArticleForm);
    fixture.componentRef.setInput('article', existing);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#art-code')).toBeNull();
    expect((fixture.nativeElement.querySelector('#art-label') as HTMLInputElement).value).toBe(
      'Bouchon liège naturel 49×24',
    );
    expect(fixture.nativeElement.textContent).toContain('BCH-LIE-4924');
  });
});
