import { TestBed } from '@angular/core/testing';
import { InventoryStatusBadge } from './inventory-status-badge';

describe('InventoryStatusBadge', () => {
  it.each([
    ['DRAFT', 'Brouillon'],
    ['VALIDATED', 'Validé'],
    ['CANCELLED', 'Annulé'],
  ] as const)('shows %s as "%s"', (status, label) => {
    const fixture = TestBed.createComponent(InventoryStatusBadge);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe(label);
  });
});
