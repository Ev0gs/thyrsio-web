import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  function setup(page: number, totalPages: number) {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('totalElements', 60);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    return { fixture, previous: buttons[0], next: buttons[1] };
  }

  it('disables "Précédent" on the first page and emits the next page', () => {
    const { fixture, previous, next } = setup(1, 3);
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));

    expect(previous.disabled).toBe(true);
    next.click();
    expect(emitted).toEqual([2]);
  });

  it('disables "Suivant" on the last page', () => {
    expect(setup(3, 3).next.disabled).toBe(true);
  });

  it('hides the buttons when everything fits on one page', () => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 1);
    fixture.componentRef.setInput('totalElements', 4);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('4');
  });
});
