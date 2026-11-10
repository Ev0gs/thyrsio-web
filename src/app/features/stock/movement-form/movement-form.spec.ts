import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MovementForm } from './movement-form';

describe('MovementForm', () => {
  it('shows errors and calls no API when the form is incomplete', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(MovementForm);
    fixture.componentRef.setInput('articles', []);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Choisis un article');
    expect(fixture.nativeElement.textContent).toContain('Indique une quantité');
    http.expectNone('/api/stock/movements');
  });
});
