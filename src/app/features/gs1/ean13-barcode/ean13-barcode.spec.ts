import { TestBed } from '@angular/core/testing';
import { Ean13Barcode } from './ean13-barcode';

describe('Ean13Barcode', () => {
  it('draws a standalone SVG, digits optional', () => {
    const fixture = TestBed.createComponent(Ean13Barcode);
    fixture.componentRef.setInput('gtin', '4006381333931');
    fixture.detectChanges();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');
    // Téléchargé tel quel, le fichier doit s'ouvrir seul : il lui faut son espace de noms
    expect(svg.outerHTML).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg.getAttribute('aria-label')).toBe('Code-barres EAN-13 4006381333931');
    expect(svg.querySelectorAll('text').length).toBe(13);

    fixture.componentRef.setInput('digits', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('text').length).toBe(0);
  });

  it('refuses something that is not 13 digits', () => {
    const fixture = TestBed.createComponent(Ean13Barcode);
    fixture.componentRef.setInput('gtin', '12345');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Gencode invalide');
  });
});
