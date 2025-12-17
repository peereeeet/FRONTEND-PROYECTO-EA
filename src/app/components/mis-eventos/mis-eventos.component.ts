import { Component, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
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
import { SocketService } from '../../services/socket.service';
import { UserService } from '../../services/user.service';
import { EventChatMessage, User } from '../../models/user.model';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { GamificacionService } from '../../services/gamificacion.service';
import { RewardNotificationService } from '../../services/reward-notification.service';
import { RewardNotificationComponent } from '../reward-notification/reward-notification.component';

@Component({
  selector: 'app-mis-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, RewardNotificationComponent],
  templateUrl: './mis-eventos.component.html',
  styleUrls: ['./mis-eventos.component.css']
})
export class MisEventosComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;
  activeTab: 'joined' | 'created' = 'joined';

  eventosCreados: Evento[] = [];
  eventosInscritos: Evento[] = [];
  loading = false;
  errorMessage = '';
  currentUserId = '';
  currentUsername = '';

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
  filtroActivo: 'todos' | 'publicos' | 'privados' = 'todos';

  q = '';
  page: number = 1;
  pageSize: number = 4;
  totalItems: number = 0;
  totalPages: number = 1;
  Math = Math;

  stars = [1, 2, 3, 4, 5];
  hover = 0;
  myScore = 0;
  myComment = '';
  saving = false;
  userHasRated = false;
  existingRatingId: string | null = null;

  private progresoInicial: any = null;

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

  private socketService = inject(SocketService);
  private destroy$ = new Subject<void>();
  eventChatOpen = signal(false);
  eventChatEvento = signal<Evento | null>(null);
  eventChatMessages = signal<EventChatMessage[]>([]);
  eventChatText = signal('');
  eventChatLoading = signal(false);
  eventChatError = signal('');

  shareModalOpen = false;
  shareEvento: Evento | null = null;
  shareFriends: User[] = [];
  shareLoading = false;
  shareError = '';

  @ViewChild('eventChatMessagesContainer')
  eventChatMessagesContainer?: ElementRef<HTMLDivElement>;

  currentLang: 'es' | 'en' | 'cat' | 'fr' =
    (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  private gamificacionService = inject(GamificacionService);
  private rewardService = inject(RewardNotificationService);

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private ratingsSrv: ValoracionService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
    private userService: UserService
  ) 
  {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  get eventoscreadosFiltrados() {
    if (this.filtroActivo === 'todos') {
      return this.eventosCreados;
    } else if (this.filtroActivo === 'publicos') {
      return this.eventosCreados.filter(e => !e.isPrivate);
    } else {
      return this.eventosCreados.filter(e => e.isPrivate);
    }
  }

  get eventosinscritosFiltrados() {
    if (this.filtroActivo === 'todos') {
      return this.eventosInscritos;
    } else if (this.filtroActivo === 'publicos') {
      return this.eventosInscritos.filter(e => !e.isPrivate);
    } else {
      return this.eventosInscritos.filter(e => e.isPrivate);
    }
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.currentUsername = user?.username || '';

    if (this.currentUserId) {
      this.socketService.connect(this.currentUserId);
      this.userService.heartbeat(this.currentUserId).subscribe({
        next: () => {},
        error: (err) => console.error('Error en heartbeat desde mis-eventos', err)
      });
      
      this.cargarProgresoInicial();
    }

    this.socketService
      .onEventChatMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        const ev = this.eventChatEvento();
        if (!ev || !msg) return;
        if (msg.eventId !== ev._id) return;

        this.eventChatMessages.update(list => {
          if (msg._id && list.some(m => m._id === msg._id)) return list;
          return [...list, msg];
        });

        this.scrollEventChatToBottom();
      });

    this.loadMisEventos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.currentUserId) {
    this.userService.heartbeat(this.currentUserId).subscribe({
      next: () => console.log('Heartbeat enviado al salir de mis-eventos'),
      error: (err) => console.error('Error en heartbeat al salir', err)
    });
  }
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
        this.loading = false;
      }
    });
  }

  goBack(): void { this.router.navigate(['/menu']); }

  goToCrear(): void {
    this.router.navigate(['/crear-evento']);
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

  isEventoFinalizado(ev: Evento): boolean {
    if (!ev?.schedule) return false;
    
    const scheduleValue = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
    if (!scheduleValue) return false;
    
    const scheduleDate = new Date(scheduleValue);
    const now = new Date();
    
    if (isNaN(scheduleDate.getTime())) return false;
    
    return scheduleDate < now;
  }

  get eventosInscritosFuturos(): Evento[] {
    return this.eventosInscritos.filter(ev => !this.isEventoFinalizado(ev));
  }

  get eventosInscritosPasados(): Evento[] {
    return this.eventosInscritos.filter(ev => this.isEventoFinalizado(ev));
  }

  get eventosCreadosFuturos(): Evento[] {
    return this.eventosCreados.filter(ev => !this.isEventoFinalizado(ev));
  }

  get eventosCreadosPasados(): Evento[] {
    return this.eventosCreados.filter(ev => this.isEventoFinalizado(ev));
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

  prevRatingsPage() {
    if (this.page > 1) {
      this.page--;
    }
  }

  nextRatingsPage() {
    const totalPages = Math.ceil(this.ratingsList.length / this.pageSize);
    if (this.page < totalPages) {
      this.page++;
    }
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

    this.userHasRated = false;
    this.existingRatingId = null;
    this.checkUserRating();
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
        this.detectarCambiosProgreso();
      },
      error: (err) => {
        this.saving = false;
        if (err.status === 409) {
          this.ratingsError = 'Ya has valorado este evento anteriormente';
          this.userHasRated = true;
          this.checkUserRating();
        } else {
          this.ratingsError = err?.error?.message || 'No se pudo guardar';
        }
      }
    });
  }

  checkUserRating(): void {
    if (!this.ratingsEventoId) return;
    
    this.ratingsSrv.getMyRatingForEvent(this.ratingsEventoId).subscribe({
      next: (rating) => {
        this.userHasRated = true;
        this.existingRatingId = rating._id;
        this.myScore = rating.puntuacion;
        this.myComment = rating.comentario || '';
      },
      error: (err) => {
        if (err.status === 404) {
          this.userHasRated = false;
          this.existingRatingId = null;
        }
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

  openEventChat(evento: Evento): void {
    if (!evento || !evento._id) return;
    this.eventChatEvento.set(evento);
    this.eventChatOpen.set(true);
    this.eventChatLoading.set(true);
    this.eventChatError.set('');
    this.eventChatText.set('');
    this.eventChatMessages.set([]);
    this.socketService.joinEventChat(evento._id);

    this.userService
      .getEventChat(evento._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msgs) => {
          const ordered = (msgs || []).slice().sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
          );
          this.eventChatMessages.set(ordered);
          this.eventChatLoading.set(false);
          this.scrollEventChatToBottom();
        },
        error: () => {
          this.eventChatError.set(
            this.translate.instant('MY_EVENTS.EVENT_CHAT_LOAD_ERROR') ||
              'Error al cargar el chat.'
          );
          this.eventChatMessages.set([]);
          this.eventChatLoading.set(false);
        }
      });
  }

  closeEventChat(): void {
    this.eventChatOpen.set(false);
    this.eventChatEvento.set(null);
    this.eventChatMessages.set([]);
    this.eventChatText.set('');
    this.eventChatError.set('');
    this.eventChatLoading.set(false);
  }

  onEventChatInput(ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.eventChatText.set(value);
  }

  sendEventChat(): void {
    const text = (this.eventChatText() || '').trim();
    const evento = this.eventChatEvento();
    if (!text || !evento?._id || !this.currentUserId) return;

    const user = this.authService.getCurrentUser();
    const username = user?.username || 'Yo';

    this.eventChatText.set('');
    this.socketService.sendEventChatMessage(
      evento._id,
      this.currentUserId,
      username,
      text
    );
  }

  private scrollEventChatToBottom(): void {
    setTimeout(() => {
      const el = this.eventChatMessagesContainer?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  openShareModal(evento: Evento): void {
    this.shareModalOpen = true;
    this.shareEvento = evento;
    this.shareFriends = [];
    this.shareError = '';
    this.shareLoading = true;

    if (!this.currentUserId) {
      this.shareError = 'No se ha podido identificar al usuario actual';
      this.shareLoading = false;
      return;
    }

    this.userService.listFriends(this.currentUserId, 1, 100, '').subscribe({
      next: (page) => {
        this.shareFriends = page?.data ?? [];
        this.shareLoading = false;
      },
      error: (err) => {
        this.shareError =
          err?.error?.message || 'No se pudieron cargar tus amigos';
        this.shareLoading = false;
      }
    });
  }

  closeShareModal(): void {
    this.shareModalOpen = false;
    this.shareEvento = null;
    this.shareFriends = [];
    this.shareError = '';
  }

  sendEventToFriend(friend: User): void {
    if (!friend?._id || !this.shareEvento?._id) return;
    const fromId = this.currentUserId;
    if (!fromId) return;

    const EVENT_INVITE_PREFIX = '__EVENT_INVITE__|';
    const safeName = (this.shareEvento.name || '').replace(/\|/g, ' ');
    const text = `${EVENT_INVITE_PREFIX}${this.shareEvento._id}|${safeName}`;

    this.socketService.sendChatMessage(fromId, String(friend._id), text);
    this.closeShareModal();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  switchTab(tab: 'joined' | 'created'): void {
    this.activeTab = tab;
  }

  cambiarFiltro(filtro: 'todos' | 'publicos' | 'privados'): void {
    this.filtroActivo = filtro;
  }

  getBadgeClass(evento: Evento): string {
    return evento.isPrivate ? 'badge-privado' : 'badge-publico';
  }

  getBadgeText(evento: Evento): string {
    return evento.isPrivate ? '🔒 Privado' : '🌐 Público';
  }

  private cargarProgresoInicial(): void {
    this.gamificacionService.obtenerMiProgreso().subscribe({
      next: (progreso) => {
        this.progresoInicial = {
          nivel: progreso.nivel,
          puntos: progreso.puntos,
          insignias: progreso.insignias.length,
          insigniasIds: progreso.insignias.map((i: any) => i._id)
        };
        console.log('📊 Progreso inicial cargado:', this.progresoInicial);
      },
      error: (err) => {
        console.error('Error al cargar progreso inicial:', err);
      }
    });
  }

  private detectarCambiosProgreso(): void {
    setTimeout(() => {
      this.gamificacionService.obtenerMiProgreso().subscribe({
        next: (progresoNuevo) => {
          if (!this.progresoInicial) {
            this.progresoInicial = {
              nivel: progresoNuevo.nivel,
              puntos: progresoNuevo.puntos,
              insignias: progresoNuevo.insignias.length,
              insigniasIds: progresoNuevo.insignias.map((i: any) => i._id)
            };
            return;
          }

          const subisteDeNivel = progresoNuevo.nivel !== this.progresoInicial.nivel;
          const insigniasAnteriores = new Set(this.progresoInicial.insigniasIds || []);
          const insigniasDesbloqueadas = progresoNuevo.insignias.filter(
            (ins: any) => !insigniasAnteriores.has(ins._id)
          );

          const puntosGanados = this.rewardService.getPuntosAccion('dejarValoracion');
          this.rewardService.showReward({
            puntosGanados,
            accion: 'dejarValoracion',
            insigniasDesbloqueadas,
            nivelAnterior: this.progresoInicial.nivel,
            nivelNuevo: progresoNuevo.nivel,
            subisteDeNivel
          });

          this.progresoInicial = {
            nivel: progresoNuevo.nivel,
            puntos: progresoNuevo.puntos,
            insignias: progresoNuevo.insignias.length,
            insigniasIds: progresoNuevo.insignias.map((i: any) => i._id)
          };

          console.log('🎮 Recompensa detectada:', {
            accion: 'dejarValoracion',
            puntosGanados,
            subisteDeNivel,
            insigniasDesbloqueadas: insigniasDesbloqueadas.length
          });
        },
        error: (err) => {
          console.error('Error al detectar cambios de progreso:', err);
        }
      });
    }, 800);
  }
}