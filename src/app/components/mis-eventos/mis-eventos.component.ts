import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Evento } from '../../models/evento.model';
import { ValoracionService } from '../../services/valoracion.service';
import { Valoracion } from '../../models/valoracion.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-mis-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './mis-eventos.component.html',
  styleUrls: ['./mis-eventos.component.css']
})
export class MisEventosComponent implements OnInit {
  eventosCreados: Evento[] = [];
  eventosInscritos: Evento[] = [];
  loading = false;
  errorMessage = '';
  currentUserId = '';

  showDeleteModal = false;
  eventoToDelete: Evento | null = null;

  showLeaveModal = false;
  eventoToLeave: Evento | null = null;

  showRatingsModal = false;
  ratingsEventoId: string | null = null;
  ratingsEventoName = '';
  ratingsAvg?: number;
  ratingsCount?: number;

  ratingsList: Valoracion[] = [];
  ratingsLoading = false;
  ratingsError = '';
  ratingsInfo = '';

  q = '';
  page: number = 1;
  pageSize: number = 4;
  totalItems: number = 0;
  totalPages: number = 1;

  stars = [1, 2, 3, 4, 5];
  hover = 0;
  myScore = 0;
  myComment = '';
  saving = false;

  showEditModal = false;
  eventoToEdit: Evento | null = null;
  editName = '';
  editAddress = '';
  editDate = '';
  editTime = '';

  showMapModal = false;
  mapEventoName = '';
  mapUrl: string | null = null;
  mapLinkUrl: string | null = null;
  mapSafeUrl: SafeResourceUrl | null = null;

  currentLang: 'es' | 'en' | 'cat' | 'fr' =
    (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private ratingsSrv: ValoracionService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private translate: TranslateService
  ) 
  {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.loadMisEventos();
  }

  loadMisEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getMisEventos().subscribe({
      next: (res: any) => {
        this.eventosCreados = (res.eventosCreados || []).map((e: any) => ({
          ...e,
          schedule: Array.isArray(e.schedule) ? e.schedule : (e.schedule ? [e.schedule] : []),
          participantes: Array.isArray(e.participantes) ? e.participantes : (e.participants || [])
        }));
        this.eventosInscritos = (res.eventosInscritos || []).map((e: any) => ({
          ...e,
          schedule: Array.isArray(e.schedule) ? e.schedule : (e.schedule ? [e.schedule] : []),
          participantes: Array.isArray(e.participantes) ? e.participantes : (e.participants || [])
        }));
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar eventos';
        console.error(err);
        this.loading = false;
      }
    });
  }

  goBack(): void { this.router.navigate(['/menu']); }

  goToCrear(): void {
    this.router.navigate(['/crear-evento']);
  }

  goToExplorar(): void {
    this.router.navigate(['/explorar-eventos']);
  }

  getCreadorName(ev: any): string {
    const c = ev?.creador || ev?.owner || ev?.createdBy;
    if (!c) return '—';
    return typeof c === 'string' ? c : (c.username || c.name || c.email || '—');
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

  // 🆕 inverso: de inputs a ISO
  private toISOFromInputs(dateStr: string, timeStr: string): string | null {
    if (!dateStr) return null;
    const t = timeStr && timeStr.trim() ? timeStr : '00:00';
    const iso = new Date(`${dateStr}T${t}:00`).toISOString();
    return iso;
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

  isUserCreator(ev: Evento): boolean {
    const cid = (ev as any)?.creador?._id || (ev as any)?.creador || (ev as any)?.owner || (ev as any)?.createdBy;
    return cid === this.currentUserId;
  }

  isUserInEvento(ev: Evento): boolean {
    const arr: any[] = (ev as any)?.participantes || [];
    return arr.some((p: any) => (typeof p === 'string' ? p === this.currentUserId : p?._id === this.currentUserId));
  }

  openDeleteModal(evento: Evento): void { this.eventoToDelete = evento; this.showDeleteModal = true; }
  closeDeleteModal(): void { this.showDeleteModal = false; this.eventoToDelete = null; }

  confirmDelete(): void {
    if (!this.eventoToDelete?._id) return;
    this.eventoService.deleteEvento(this.eventoToDelete._id).subscribe({
      next: () => { this.closeDeleteModal(); this.loadMisEventos(); },
      error: () => { this.errorMessage = 'No se pudo eliminar el evento.'; this.closeDeleteModal(); }
    });
  }

  openLeaveModal(evento: Evento): void { this.eventoToLeave = evento; this.showLeaveModal = true; }
  closeLeaveModal(): void { this.showLeaveModal = false; this.eventoToLeave = null; }

  confirmLeave(): void {
    if (!this.eventoToLeave?._id) return;
    this.eventoService.leaveEvento(this.eventoToLeave._id).subscribe({
      next: () => { this.closeLeaveModal(); this.loadMisEventos(); },
      error: () => { this.errorMessage = 'No se pudo salir del evento.'; this.closeLeaveModal(); }
    });
  }

  joinEvento(ev: Evento): void {
    if (!ev?._id) return;
    this.eventoService.joinEvento(ev._id).subscribe({
      next: () => this.loadMisEventos(),
      error: (err) => this.errorMessage = err?.error?.message || 'Error al unirse al evento'
    });
  }

  private recalcRatingsPager(): void {
    this.totalItems = (this.ratingsList?.length ?? 0);
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
  }

  openRatingsModal(ev: Evento) {
    this.showRatingsModal = true;
    this.ratingsEventoId = ev._id!;
    this.ratingsEventoName = ev.name || '';
    this.ratingsAvg = typeof (ev as any).avgRating === 'number' ? (ev as any).avgRating : undefined;
    this.ratingsCount = typeof (ev as any).ratingsCount === 'number' ? (ev as any).ratingsCount : undefined;

    this.q = '';
    this.page = 1;
    this.pageSize = 4;
    this.hover = 0; this.myScore = 0; this.myComment = '';
    this.loadRatingsList();
    this.refreshRatingsAggregates();
    this.recalcRatingsPager();
  }

  closeRatingsModal(): void {
    this.showRatingsModal = false;
    this.ratingsEventoId = null;
  }

  private refreshRatingsAggregates() {
    if (!this.ratingsEventoId) return;
    this.eventoService.getEventoById(this.ratingsEventoId).subscribe({
      next: (ev: any) => {
        this.ratingsAvg = typeof ev?.avgRating === 'number' ? ev.avgRating : 0;
        this.ratingsCount = typeof ev?.ratingsCount === 'number' ? ev.ratingsCount : 0;
      },
      error: () => {
        if (this.ratingsAvg == null) this.ratingsAvg = 0;
        if (this.ratingsCount == null) this.ratingsCount = 0;
      }
    });
  }

  private loadRatingsList() {
    if (!this.ratingsEventoId) return;
    this.ratingsLoading = true;
    this.ratingsError = '';

    this.ratingsSrv
      .listByEvent(this.ratingsEventoId, this.page, this.pageSize, this.q)
      .subscribe({
        next: (res) => {
          this.ratingsList = res.data;
          this.page = res.page;
          this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
          this.totalItems = res.totalItems;
          if (this.page > this.totalPages) this.page = 1;
          this.ratingsLoading = false;
        },
        error: () => {
          this.ratingsError = 'Error cargando valoraciones';
          this.ratingsList = [];
          this.totalItems = 0;
          this.totalPages = 1;
          this.page = 1;
          this.ratingsLoading = false;
        }
      });
  }

  changeRatingsPage(delta: number) {
    const newPage = this.page + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
    }
  }

  searchRatings(): void {
    this.page = 1;
    this.loadRatingsList();
    this.recalcRatingsPager();
  }

  setRatingsPageSize(v: string) {
    const n = parseInt(v, 10) || 3;
    this.pageSize = n;
    this.page = 1;
    this.loadRatingsList();
  }

  setScore(v: number): void { this.myScore = v; }

  saveRating(): void {
    if (!this.ratingsEventoId) return;
    this.ratingsError = '';
    this.ratingsInfo = '';

    if (this.myScore < 1 || this.myScore > 5) {
      this.ratingsError = 'Selecciona una puntuación entre 1 y 5.';
      return;
    }

    this.saving = true;
    this.ratingsSrv.create(this.ratingsEventoId, { puntuacion: this.myScore, comentario: this.myComment }).subscribe({
      next: () => {
        this.saving = false;
        this.ratingsInfo = '¡Valoración guardada!';
        this.hover = 0;
        this.myScore = 0;
        this.myComment = '';
        this.loadRatingsList();
        this.refreshRatingsAggregates();
        this.loadMisEventos();
      },
      error: (err) => {
        this.saving = false;
        this.ratingsError = err?.error?.message || 'No se pudo guardar la valoración';
      }
    });
  }

  openEditModal(evento: Evento): void {
    this.eventoToEdit = evento;
    this.showEditModal = true;

    this.editName = evento.name || '';
    this.editAddress = (evento as any).address || '';

    const schedules = (evento as any).schedule;
    const firstSchedule = Array.isArray(schedules) ? schedules[0] : schedules;

    const { dateStr, timeStr } = this.fromISOtoInputs(firstSchedule);
    this.editDate = dateStr;
    this.editTime = timeStr;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.eventoToEdit = null;
    this.editName = '';
    this.editAddress = '';
    this.editDate = '';
    this.editTime = '';
  }

confirmEdit(): void {
  if (!this.eventoToEdit?._id) return;

  const scheduleISO = this.toISOFromInputs(this.editDate, this.editTime);

  const updatedEvento: Evento = {
    ...this.eventoToEdit,
    name: this.editName,
    address: this.editAddress,
    schedule: (scheduleISO as any) ?? (this.eventoToEdit as any).schedule,
    participantes: this.eventoToEdit.participantes || []
  };

  this.eventoService.updateEvento(updatedEvento).subscribe({
    next: (updated: any) => {
      this.eventosCreados = this.eventosCreados.map(ev =>
        ev._id === updated._id
          ? {
              ...updated,
              schedule: Array.isArray(updated.schedule)
                ? updated.schedule
                : (updated.schedule ? [updated.schedule] : []),
              participantes: Array.isArray(updated.participantes)
                ? updated.participantes
                : (updated.participants || [])
            }
          : ev
      );

      this.closeEditModal();
    },
    error: (err) => {
      console.error('Error al actualizar evento', err);
      this.errorMessage = err?.error?.message || 'No se pudo actualizar el evento.';
    }
  });
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
