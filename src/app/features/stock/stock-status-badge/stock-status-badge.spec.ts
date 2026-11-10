import { TestBed } from '@angular/core/testing';
import { StockStatusBadge } from './stock-status-badge';

describe('StockStatusBadge', () => {
  it.each([
    ['OK', 'OK'],
    ['BELOW_THRESHOLD', 'Sous le seuil'],
    ['OUT_OF_STOCK', 'Rupture'],
  ] as const)('shows %s as "%s"', (status, label) => {
    const fixture = TestBed.createComponent(StockStatusBadge);
    fixture.componentRef.setInput('status', status); // un input.required doit recevoir une valeur
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe(label);
  });
});
