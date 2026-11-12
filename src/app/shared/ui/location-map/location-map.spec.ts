import { TestBed } from '@angular/core/testing';
import { LocationMap, MapPoint } from './location-map';

const bordeaux: MapPoint = {
  id: 'c1',
  label: 'Cave Bordelaise',
  location: { latitude: 44.8378, longitude: -0.5792, approximate: false },
};

describe('LocationMap', () => {
  it('links a single point to OpenStreetMap and Google Maps', () => {
    const fixture = TestBed.createComponent(LocationMap);
    fixture.componentRef.setInput('points', [bordeaux]);
    fixture.detectChanges();

    const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent!.trim())).toEqual(['OpenStreetMap', 'Google Maps']);
    expect(links[0].href).toContain('mlat=44.8378');
    expect(links[1].href).toContain('query=44.8378,-0.5792');
    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe(
      'Carte : Cave Bordelaise',
    );
  });

  it('says when only the town was found', () => {
    const fixture = TestBed.createComponent(LocationMap);
    fixture.componentRef.setInput('points', [
      { ...bordeaux, location: { ...bordeaux.location, approximate: true } },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Position approximative');
  });

  it('shows no links when several points are on the map', () => {
    const fixture = TestBed.createComponent(LocationMap);
    fixture.componentRef.setInput('points', [bordeaux, { ...bordeaux, id: 'c2', label: 'Lyon' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(0);
  });
});
