import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentUser } from '../../core/auth/current-user';
import { Shell } from './shell';

describe('Shell', () => {
  it('renders the sidebar next to the page content', async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        {
          provide: CurrentUser,
          useValue: { name: 'Pierre Martin', initials: 'PM', isAdmin: false },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
  });
});
