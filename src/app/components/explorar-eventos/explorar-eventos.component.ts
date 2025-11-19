import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Evento } from '../../models/evento.model';

@Component({
  selector: 'app-explorar-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './explorar-eventos.component.html',
  styleUrls: ['./explorar-eventos.component.css']
})
export class ExplorarEventosComponent implements OnInit {
  eventos: Evento[] = [];
  loading = false;
  errorMessage = '';
  currentUserId: string = '';
  userRole: string = '';
  
  page = 1;
  pageSize = 6;
  totalPages = 1;
  totalItems = 0;

  selectedMapEvent: Evento | null = null;
  mapEventoName = '';
  mapUrl: string | null = null;
  mapLinkUrl: string | null = null;
  mapSafeUrl: SafeResourceUrl | null = null;

  showEventModal = false;
  selectedEvent: Evento | null = null;

  showMapModal = false;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.userRole = user?.rol || 'usuario';
  
    this.loadEventos();
  }

  loadEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getEventos(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.eventos = res.data.map(e => ({
          ...e,
          lat: e.lat != null ? Number(e.lat) : undefined,
          lng: e.lng != null ? Number(e.lng) : undefined,
          schedule: Array.isArray(e.schedule) 
            ? e.schedule 
            : [e.schedule as any],
          
          participantes: Array.isArray((e as any).participantes)
            ? (e as any).participantes
            : ((e as any).participants || [])
        }));

        this.totalPages = res.totalPages;
        this.totalItems = res.totalItems;
        this.loading = false;

        const firstWithLocation = this.eventos.find(ev => this.hasLocation(ev));
        if (firstWithLocation) {
          this.setMapForEvent(firstWithLocation);
        } else {
          this.selectedMapEvent = null;
          this.mapSafeUrl = null;
          this.mapLinkUrl = null;
          this.mapEventoName = '';
        }
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar eventos';
        this.loading = false;
        console.error(err);
      }
    });
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadEventos();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadEventos();
    }
  }

  joinEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.joinEvento(evento._id).subscribe({
      next: (updatedEvento) => {
        const index = this.eventos.findIndex(e => e._id === evento._id);
        if (index !== -1) {
          this.eventos[index] = {
            ...updatedEvento,
            lat: updatedEvento.lat != null ? Number(updatedEvento.lat) : undefined,
            lng: updatedEvento.lng != null ? Number(updatedEvento.lng) : undefined,
            schedule: Array.isArray(updatedEvento.schedule)
              ? updatedEvento.schedule
              : [updatedEvento.schedule as any],
            participantes: Array.isArray((updatedEvento as any).participantes)
              ? (updatedEvento as any).participantes
              : ((updatedEvento as any).participants || [])
          };
        }
        if (this.selectedMapEvent && this.selectedMapEvent._id === evento._id) {
          this.setMapForEvent(this.eventos[index]);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al unirse al evento';
        console.error(err);
      }
    });
  }

  leaveEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.leaveEvento(evento._id).subscribe({
      next: (updatedEvento) => {
        const index = this.eventos.findIndex(e => e._id === evento._id);
        if (index !== -1) {
          this.eventos[index] = {
            ...updatedEvento,
            lat: updatedEvento.lat != null ? Number(updatedEvento.lat) : undefined,
            lng: updatedEvento.lng != null ? Number(updatedEvento.lng) : undefined,
            schedule: Array.isArray(updatedEvento.schedule)
              ? updatedEvento.schedule
              : [updatedEvento.schedule as any],
            participantes: Array.isArray((updatedEvento as any).participantes)
              ? (updatedEvento as any).participantes
              : ((updatedEvento as any).participants || [])
          };
        }
        if (this.selectedMapEvent && this.selectedMapEvent._id === evento._id) {
          this.setMapForEvent(this.eventos[index]);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al salir del evento';
        console.error(err);
      }
    });
  }

  isUserInEvento(evento: Evento): boolean {
    if (!this.currentUserId || !evento.participantes) return false;
    return evento.participantes.includes(this.currentUserId);
  }

  isUserCreator(evento: Evento): boolean {
    if (!this.currentUserId || !evento.creador) return false;
    if (typeof evento.creador === 'object') {
      return evento.creador._id === this.currentUserId;
    }
    return evento.creador === this.currentUserId;
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  private readonly timeZone = 'Europe/Madrid';

  private fromISOtoInputs(iso?: any): { dateStr: string; timeStr: string } {
    if (!iso) return { dateStr: '', timeStr: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear(), mm = pad(d.getMonth() + 1), dd = pad(d.getDate());
    const hh = pad(d.getHours()), mi = pad(d.getMinutes());
    return { dateStr: `${yyyy}-${mm}-${dd}`, timeStr: `${hh}:${mi}` };
  }

  private formatSchedule(iso?: any): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    const { dateStr } = this.fromISOtoInputs(iso);
    const savedAtMidnight =
      d.getUTCHours() === 0 && d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 &&
      (new Date(`${dateStr}T00:00:00Z`).toISOString() === new Date(iso).toISOString());

    const base = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      timeZone: this.timeZone,
    }).format(d).replace('.', '');

    if (savedAtMidnight) return `${base} · todo el día`;

    const hm = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.timeZone,
    }).format(d);

    return `${base} · ${hm}`;
  }

  getScheduleText = (ev: any) => this.formatSchedule(ev?.schedule);

  getCreadorName(evento: Evento): string {
    if (typeof evento.creador === 'object' && evento.creador) {
      return evento.creador.username;
    }
    return 'Desconocido';
  }

  goBack(): void {
    this.router.navigate(['/menu']);
  }

  goToRatings(evento: Evento): void {
    if (!evento._id) return;
    this.router.navigate(['/events', evento._id, 'ratings'], {
      state: { 
        eventoName: evento.name,
        avgRating: evento.avgRating,
        ratingsCount: evento.ratingsCount
      }
    });
  }

  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }

  hasLocation(evento: any): boolean {
    if (!evento) return false;
    const hasCoords =
      evento.lat !== null &&
      evento.lat !== undefined &&
      evento.lng !== null &&
      evento.lng !== undefined;
    const hasAddress = !!evento.address;
    return hasCoords || hasAddress;
  }

  setMapForEvent(evento: Evento): void {
    if (!this.hasLocation(evento)) {
      this.selectedMapEvent = null;
      this.mapEventoName = '';
      this.mapUrl = null;
      this.mapLinkUrl = null;
      this.mapSafeUrl = null;
      return;
    }

    this.selectedMapEvent = evento;
    this.mapEventoName = evento.name || '';
    this.mapUrl = null;
    this.mapLinkUrl = null;
    this.mapSafeUrl = null;

    const lat = Number((evento as any).lat);
    const lng = Number((evento as any).lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      const delta = 0.005;
      const south = lat - delta;
      const north = lat + delta;
      const west = lng - delta;
      const east = lng + delta;

      this.mapUrl =
        'https://www.openstreetmap.org/export/embed.html?bbox=' +
        `${west},${south},${east},${north}` +
        '&layer=mapnik&marker=' +
        `${lat},${lng}`;

      this.mapLinkUrl =
        'https://www.openstreetmap.org/?mlat=' +
        `${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    } else if ((evento as any).address) {
      const query = encodeURIComponent((evento as any).address);
      this.mapUrl = `https://www.google.com/maps?q=${query}&output=embed`;
      this.mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    if (this.mapUrl) {
      this.mapSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.mapUrl);
    } else {
      this.mapSafeUrl = null;
    }
  }

  openEventModal(evento: Evento): void {
    this.selectedEvent = evento;
    this.showEventModal = true;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  hasLocation2(evento: any): boolean {
    if (!evento) return false;
    const hasCoords =
      evento.lat !== null &&
      evento.lat !== undefined &&
      evento.lng !== null &&
      evento.lng !== undefined;
    const hasAddress = !!evento.address;
    return hasCoords || hasAddress;
  }

  openMap(evento: any): void {
    if (!this.hasLocation(evento)) return;

    this.mapEventoName = evento.name || '';
    this.mapUrl = null;
    this.mapLinkUrl = null;
    this.mapSafeUrl = null;

    const lat = Number(evento.lat);
    const lng = Number(evento.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      const delta = 0.005;
      const south = lat - delta;
      const north = lat + delta;
      const west = lng - delta;
      const east = lng + delta;

      this.mapUrl =
        'https://www.openstreetmap.org/export/embed.html?bbox=' +
        `${west},${south},${east},${north}` +
        '&layer=mapnik&marker=' +
        `${lat},${lng}`;

      this.mapLinkUrl =
        'https://www.openstreetmap.org/?mlat=' +
        `${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    } else if (evento.address) {
      const query = encodeURIComponent(evento.address);
      this.mapUrl = `https://www.google.com/maps?q=${query}&output=embed`;
      this.mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    if (this.mapUrl) {
      this.mapSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.mapUrl);
    } else {
      this.mapSafeUrl = null;
    }

    this.showMapModal = true;
  }

  closeMapModal(): void {
    this.showMapModal = false;
    this.mapEventoName = '';
    this.mapUrl = null;
    this.mapLinkUrl = null;
    this.mapSafeUrl = null;
  }
}