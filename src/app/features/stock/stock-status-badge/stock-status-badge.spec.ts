import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockStatusBadge } from './stock-status-badge';

describe('StockStatusBadge', () => {
  let component: StockStatusBadge;
  let fixture: ComponentFixture<StockStatusBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockStatusBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(StockStatusBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
