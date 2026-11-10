import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockOverview } from './stock-overview';

describe('StockOverview', () => {
  let component: StockOverview;
  let fixture: ComponentFixture<StockOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockOverview],
    }).compileComponents();

    fixture = TestBed.createComponent(StockOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
