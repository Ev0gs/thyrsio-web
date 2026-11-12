import { TestBed } from '@angular/core/testing';
import { TankIllustration } from './tank-illustration';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(TankIllustration);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('TankIllustration', () => {
  it('fills the tank to its level with the colour of the wine', () => {
    const element = render({ volumeHl: 246, capacityHl: 300, color: 'RED', state: 'IN_USE' });

    const meter = element.querySelector('[role="meter"]')!;
    expect(meter.getAttribute('aria-label')).toBe('Cuve remplie à 82 %');
    expect(meter.getAttribute('aria-valuemax')).toBe('300');
    expect(element.textContent).toContain('82 %');
    // 82 % de la hauteur intérieure (195) au-dessus du fond (216)
    const level = element.querySelector<SVGGElement>('.level')!;
    expect(parseFloat(level.style.transform.replace('translateY(', ''))).toBeCloseTo(56.1, 1);
  });

  it('says why a tank holds no wine', () => {
    const element = render({ volumeHl: 0, capacityHl: 200, color: null, state: 'CLEANING' });

    expect(element.querySelector('.level')).toBeNull();
    expect(element.textContent).toContain('En nettoyage');
    expect(element.querySelector('[role="meter"]')!.getAttribute('aria-label')).toBe(
      'Cuve sans vin : en nettoyage',
    );
  });
});
