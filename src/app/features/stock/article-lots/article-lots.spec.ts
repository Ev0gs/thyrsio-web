import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArticleLots } from './article-lots';

describe('ArticleLots', () => {
  let component: ArticleLots;
  let fixture: ComponentFixture<ArticleLots>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleLots],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleLots);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
