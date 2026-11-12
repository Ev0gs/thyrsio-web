import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';
import { GeoLocation, googleMapsUrl, openStreetMapUrl } from '../../../core/geo';

/** Un point de la carte. primary : le point principal (le siège, l'adresse livrée), en bordeaux. */
export interface MapPoint {
  id: string;
  label: string;
  location: GeoLocation;
  detail?: string;
  primary?: boolean;
}

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/**
 * Une carte OpenStreetMap (Leaflet), avec un ou plusieurs points.
 * Leaflet n'est chargé qu'au premier affichage d'une carte : il ne pèse pas sur les autres pages.
 * Un seul point : centré, avec les liens « OpenStreetMap » et « Google Maps » en dessous.
 * Plusieurs : la carte les englobe tous ; un clic sur un point émet (selected).
 */
@Component({
  selector: 'app-location-map',
  template: `
    <div class="flex flex-col gap-1.5">
      <div
        #map
        role="img"
        [attr.aria-label]="ariaLabel()"
        class="isolate w-full overflow-hidden rounded-lg border border-border bg-muted"
        [class]="heightClass()"
      ></div>
      @if (single(); as point) {
        <div
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground"
        >
          <span>
            @if (point.location.approximate) {
              Position approximative : la ville a été trouvée, pas la rue.
            }
          </span>
          <span class="flex gap-3">
            <a
              [href]="osmUrl(point.location)"
              target="_blank"
              rel="noopener"
              class="hover:text-foreground hover:underline"
            >
              OpenStreetMap
            </a>
            <a
              [href]="googleUrl(point.location)"
              target="_blank"
              rel="noopener"
              class="hover:text-foreground hover:underline"
            >
              Google Maps
            </a>
          </span>
        </div>
      }
    </div>
  `,
})
export class LocationMap {
  readonly points = input.required<MapPoint[]>();
  /** La hauteur, en classe Tailwind. */
  readonly heightClass = input('h-56');
  readonly selected = output<string>();

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');

  protected readonly single = computed(() =>
    this.points().length === 1 ? this.points()[0] : null,
  );
  protected readonly ariaLabel = computed(
    () =>
      'Carte : ' +
      this.points()
        .map((point) => point.label)
        .join(', '),
  );
  protected readonly osmUrl = openStreetMapUrl;
  protected readonly googleUrl = googleMapsUrl;

  private leaflet: typeof Leaflet | null = null;
  private map: Leaflet.Map | null = null;
  private markers: Leaflet.LayerGroup | null = null;

  constructor() {
    afterNextRender(async () => {
      try {
        const module = await import('leaflet');
        // Selon le bundler, l'API est sur le module ou sur son export par défaut
        this.leaflet = ((module as unknown as { default?: typeof Leaflet }).default ??
          module) as typeof Leaflet;
        this.createMap();
      } catch {
        // Pas de carte (Leaflet indisponible, environnement de test...) : la page reste utilisable
      }
    });

    // Les points changent (rechargement, filtre) : on redessine sans recréer la carte
    effect(() => {
      const points = this.points();
      untracked(() => this.draw(points));
    });

    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private createMap(): void {
    const L = this.leaflet!;
    this.map = L.map(this.container().nativeElement, {
      scrollWheelZoom: false, // la molette fait défiler la page, pas la carte
      attributionControl: true,
    });
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(this.map);
    this.markers = L.layerGroup().addTo(this.map);
    this.draw(this.points());
  }

  private draw(points: MapPoint[]): void {
    const L = this.leaflet;
    if (!L || !this.map || !this.markers) {
      return;
    }
    this.markers.clearLayers();
    for (const point of points) {
      const latLng = L.latLng(point.location.latitude, point.location.longitude);
      if (point.location.approximate) {
        // La ville seulement : un cercle plutôt qu'une épingle trop précise
        L.circle(latLng, { radius: 1500, color: '#7f1d3a', weight: 1, fillOpacity: 0.08 }).addTo(
          this.markers,
        );
      }
      const marker = L.marker(latLng, {
        title: point.label,
        icon: L.divIcon({
          className: point.primary ? 'map-pin' : 'map-pin map-pin--secondary',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10],
        }),
      });
      marker.bindTooltip(
        `<strong>${escapeHtml(point.label)}</strong>` +
          (point.detail ? `<br>${escapeHtml(point.detail)}` : ''),
        { direction: 'top', offset: [0, -8] },
      );
      marker.on('click', () => this.selected.emit(point.id));
      marker.addTo(this.markers);
    }

    if (points.length === 1) {
      const { latitude, longitude, approximate } = points[0].location;
      this.map.setView([latitude, longitude], approximate ? 12 : 15);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.location.latitude, p.location.longitude]));
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    } else {
      this.map.setView([46.6, 2.4], 5); // la France, faute de mieux
    }
  }
}
