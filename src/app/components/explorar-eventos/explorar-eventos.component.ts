import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Evento } from '../../models/evento.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-explorar-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './explorar-eventos.component.html',
  styleUrls: ['./explorar-eventos.component.css']
})
export class ExplorarEventosComponent implements OnInit, AfterViewInit {
  allEventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  eventos: Evento[] = [];

  loading = false;
  errorMessage = '';

  currentUserId = '';
  currentUserRole = '';

  page = 1;
  pageSize = 6;
  totalItems = 0;
  totalPages = 1;

  private map: maplibregl.Map | null = null;
  private markers: maplibregl.Marker[] = [];
  private mapReady = false;

  selectedEvent: Evento | null = null;
  showEventModal = false;

  currentLang: 'es' | 'en' | 'cat' | 'fr' =
    (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id ?? '';
    this.currentUserRole = user?.rol ?? 'usuario';
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: 'explorar-map',
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles'
          }
        ]
      },
      center: [1.7, 41.3],
      zoom: 11
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      this.mapReady = true;
      this.fetchEventosForCurrentView(false);
      this.map?.resize();
    });

    this.map.on('moveend', () => {
      this.actualizarListaSegunMapa();
    });
  }


  private getMapBounds() {
    if (!this.map) return null;
    const b = this.map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest()
    };
  }

  private fetchEventosForCurrentView(fromMapMove: boolean = false): void {
    if (!this.map) return;

    const bounds = this.getMapBounds();
    if (!fromMapMove) {
      this.loading = true;
    }
    this.errorMessage = '';

    const finalizar = () => {
      if (!fromMapMove) {
        this.loading = false;
      }
    };

    if (!bounds) {
      this.eventoService.getEventos(this.page, this.pageSize).subscribe({
        next: (resp) => {
          const lista = resp?.data ?? [];
          const mapped = lista.map((raw: any) => {
            const schedules = Array.isArray(raw.schedule)
              ? raw.schedule
              : raw.schedule
              ? [raw.schedule]
              : [];

            return {
              ...raw,
              lat: raw.lat != null ? Number(raw.lat) : undefined,
              lng: raw.lng != null ? Number(raw.lng) : undefined,
              schedule: schedules,
              participantes: Array.isArray(raw.participantes)
                ? raw.participantes
                : raw.participantes
                ? [raw.participantes]
                : [],
            } as Evento;
          });

          this.allEventos = mapped;
          this.eventosFiltrados = mapped;
          this.totalItems = resp.totalItems ?? mapped.length;
          this.totalPages =
            resp.totalPages ??
            Math.max(1, Math.ceil(this.totalItems / this.pageSize));
          if (this.page > this.totalPages) this.page = this.totalPages || 1;

          this.eventos = mapped;

          this.pintarMarcadores();
          finalizar();
        },
        error: (err) => {
          console.error(err);
          this.eventos = [];
          this.allEventos = [];
          this.eventosFiltrados = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.errorMessage =
            err?.error?.message || 'Error al cargar eventos desde el servidor.';
          this.limpiarMarcadores();
          finalizar();
        },
      });

      return;
    }

    this.eventoService
      .getEventosByBounds(
        bounds.north,
        bounds.south,
        bounds.east,
        bounds.west,
        this.page,
        this.pageSize
      )
      .subscribe({
        next: (resp) => {
          const lista = resp?.data ?? [];
          const mapped = lista.map((raw: any) => {
            const schedules = Array.isArray(raw.schedule)
              ? raw.schedule
              : raw.schedule
              ? [raw.schedule]
              : [];

            return {
              ...raw,
              lat: raw.lat != null ? Number(raw.lat) : undefined,
              lng: raw.lng != null ? Number(raw.lng) : undefined,
              schedule: schedules,
              participantes: Array.isArray(raw.participantes)
                ? raw.participantes
                : raw.participantes
                ? [raw.participantes]
                : [],
            } as Evento;
          });

          this.allEventos = mapped;
          this.eventosFiltrados = mapped;
          this.totalItems = resp.totalItems ?? mapped.length;
          this.totalPages =
            resp.totalPages ??
            Math.max(1, Math.ceil(this.totalItems / this.pageSize));
          if (this.page > this.totalPages) this.page = this.totalPages || 1;

          this.eventos = mapped;

          this.pintarMarcadores();
          finalizar();
        },
        error: (err) => {
          console.error(err);
          this.eventos = [];
          this.allEventos = [];
          this.eventosFiltrados = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.errorMessage =
            err?.error?.message || 'Error al cargar eventos desde el servidor.';
          this.limpiarMarcadores();
          finalizar();
        },
      });
  }

  private loadAllEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getEventos(1, 1000).subscribe({
      next: (resp: any) => {
        const lista =
          resp?.eventos ||
          resp?.data ||
          resp?.allEventos ||
          resp?.results ||
          [];

        this.allEventos = lista.map((e: any) => ({
          ...e,
          lat: e.lat != null ? Number(e.lat) : null,
          lng: e.lng != null ? Number(e.lng) : null,
          schedule: Array.isArray(e.schedule)
            ? e.schedule
            : (e.schedule ? [e.schedule] : []),
          participantes: Array.isArray(e.participantes)
            ? e.participantes
            : (Array.isArray(e.participants) ? e.participants : [])
        }));

        this.loading = false;

        this.page = 1;
        this.fetchEventosForCurrentView();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = 'Error al cargar eventos.';
      }
    });
  }

  private actualizarListaSegunMapa(): void {
    if (!this.mapReady) return;
    this.fetchEventosForCurrentView(true);
  }

  private pintarMarcadores(): void {
    if (!this.map) return;
    this.markers.forEach(m => m.remove());
    this.markers = [];

    this.eventos.forEach(ev => {
      if (ev.lat == null || ev.lng == null) return;

      const marker = new maplibregl.Marker({ color: '#4f46e5' })
        .setLngLat([Number(ev.lng), Number(ev.lat)])
        .addTo(this.map as maplibregl.Map);

      const el = marker.getElement();
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        this.openEventModal(ev);
      });

      this.markers.push(marker);
    });
  }

  private limpiarMarcadores(): void {
    if (!this.map) return;
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  private fitMapToAllEventos(): void {
    if (!this.map || this.allEventos.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    this.allEventos.forEach(ev => {
      if (ev.lat != null && ev.lng != null) {
        bounds.extend([Number(ev.lng), Number(ev.lat)]);
      }
    });

    if (!bounds.isEmpty()) {
      this.map.fitBounds(bounds, { padding: 60 });
    }
  }

  openEventModal(ev: Evento): void {
    this.selectedEvent = ev;
    this.showEventModal = true;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  joinEvento(ev: Evento): void {
    if (!ev._id) return;

    this.eventoService.joinEvento(ev._id).subscribe({
      next: (updated: any) => {
        const idx = this.allEventos.findIndex(e => e._id === ev._id);
        if (idx !== -1) {
          this.allEventos[idx] = updated;
        }
        this.actualizarListaSegunMapa();
        this.pintarMarcadores();
        if (this.selectedEvent && this.selectedEvent._id === ev._id) {
          this.selectedEvent = updated;
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || 'Error al unirse al evento.';
      }
    });
  }

  leaveEvento(ev: Evento): void {
    if (!ev._id) return;

    this.eventoService.leaveEvento(ev._id).subscribe({
      next: (updated: any) => {
        const idx = this.allEventos.findIndex(e => e._id === ev._id);
        if (idx !== -1) {
          this.allEventos[idx] = updated;
        }
        this.actualizarListaSegunMapa();
        this.pintarMarcadores();

        if (this.selectedEvent && this.selectedEvent._id === ev._id) {
          this.selectedEvent = updated;
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = err?.error?.message || 'Error al salir del evento.';
      }
    });
  }

  isUserCreator(ev: Evento): boolean {
    if (!this.currentUserId || !ev.creador) return false;

    const c: any = ev.creador;
    const creadorId = typeof c === 'string' ? c : c?._id;
    return creadorId === this.currentUserId;
  }

  isUserInEvento(ev: Evento): boolean {
    if (!this.currentUserId || !ev.participantes) return false;
    return (ev.participantes as any[]).some(p =>
      typeof p === 'string' ? p === this.currentUserId : p?._id === this.currentUserId
    );
  }

  isAdmin(): boolean {
    return this.currentUserRole === 'admin';
  }

  getCreadorName(ev: any): string {
    const c = ev.creador;
    if (!c) return 'Desconocido';
    if (typeof c === 'string') return c;
    return c.username || c.gmail || 'Desconocido';
  }

  getScheduleText(ev: any): string {
    const s = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
    if (!s) return 'Sin fecha definida';

    const d = new Date(s);
    if (isNaN(d.getTime())) return 'Horario no válido';

    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }

  goToCrear(): void {
    this.router.navigate(['/crear-evento']);
  }

  goToMisEventos(): void {
    this.router.navigate(['/mis-eventos']);
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.fetchEventosForCurrentView(true);
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.fetchEventosForCurrentView(true);
    }
  }

  changeLanguage(lang: 'es' | 'en') {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }
}
