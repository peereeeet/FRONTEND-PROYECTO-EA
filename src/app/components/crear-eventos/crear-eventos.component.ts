import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { Evento, CATEGORIAS_EVENTO, EventoCategoria } from '../../models/evento.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { GamificacionService } from '../../services/gamificacion.service';
import { RewardNotificationService } from '../../services/reward-notification.service';
import { RewardNotificationComponent } from '../reward-notification/reward-notification.component';

type NewEventDTO = {
  name: string;
  schedule: string;
  address?: string;
  participants: string[];
  lat?: number | null;
  lng?: number | null;
  categoria?: string;
  isPrivate?: boolean;
  invitedUsers?: string[];
};

@Component({
  selector: 'app-crear-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RewardNotificationComponent],
  templateUrl: './crear-eventos.component.html',
  styleUrls: ['./crear-eventos.component.css'],
})
export class CrearEventosComponent implements OnInit {
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private eventoService = inject(EventoService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private gamificacionService = inject(GamificacionService);
  private rewardService = inject(RewardNotificationService);
  
  theme = this.themeService.theme;

  formSubmitted = false;
  saving = false;
  errorMessage = '';

  newEvent: NewEventDTO = {
    name: '',
    schedule: '',
    address: '',
    participants: [],
    lat: null,
    lng: null,
    categoria: '',
    isPrivate: false,
    invitedUsers: [],
  };

  dateStr = '';
  timeStr = '';

  latStr = '';
  lngStr = '';

  todayISO: string = '';

  currentLang: 'es' | 'en' | 'cat' | 'fr' =
    (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;
  categoriasDisponibles = CATEGORIAS_EVENTO;

  categoriaSearch = '';
  showCategoriaDropdown = false;

  amigos: User[] = [];
  amigosSeleccionados: string[] = [];
  searchAmigoQuery = '';

  constructor(private translate: TranslateService) {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  allUsers: User[] = [];
  me: User | null = null;

  selectedUsers: User[] = [];
  availableUsers: User[] = [];

  availablePage = 1;
  availablePageSize = 8;
  get availableTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.availableUsers.length / this.availablePageSize)
    );
  }
  get availablePageItems(): User[] {
    const start = (this.availablePage - 1) * this.availablePageSize;
    return this.availableUsers.slice(start, start + this.availablePageSize);
  }

  selectedPage = 1;
  selectedPageSize = 8;
  get selectedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.selectedUsers.length / this.selectedPageSize)
    );
  }
  get selectedPageItems(): User[] {
    const start = (this.selectedPage - 1) * this.selectedPageSize;
    return this.selectedUsers.slice(start, start + this.selectedPageSize);
  }

  get categoriasFiltradas(): EventoCategoria[] {
    if (!this.categoriaSearch || this.categoriaSearch.trim() === '') {
      return this.categoriasDisponibles;
    }
    const search = this.categoriaSearch.toLowerCase().trim();
    return this.categoriasDisponibles.filter(cat => 
      cat.toLowerCase().includes(search)
    );
  }

  get amigosFiltrados(): User[] {
    if (!this.searchAmigoQuery.trim()) {
      return this.amigos;
    }
    const query = this.searchAmigoQuery.toLowerCase();
    return this.amigos.filter(amigo =>
      amigo.username.toLowerCase().includes(query) ||
      amigo.gmail.toLowerCase().includes(query)
    );
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe((u) => {
      if (!u) {
        this.router.navigate(['/login']);
        return;
      }
      this.me = u as User;
      this.loadUsers();
      this.cargarProgresoInicial();
      this.cargarAmigos();
    });
    const t = new Date();
    this.todayISO = new Date(Date.UTC(
      t.getFullYear(),
      t.getMonth(),
      t.getDate()
    )).toISOString().slice(0, 10);
    
    this.categoriaSearch = this.newEvent.categoria || '';
  }

  private progresoInicial: any = null;
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

          const puntosGanados = this.rewardService.getPuntosAccion('crearEvento');

          this.rewardService.showReward({
            puntosGanados,
            accion: 'crearEvento',
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
            accion: 'crearEvento',
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

  private loadUsers(): void {
    this.userService.getUsers(1, 200, '').subscribe({
      next: (page) => {
        this.allUsers = (page?.data ?? []).filter(
          (u) => u._id !== this.me?._id
        );
        this.recomputeLists();
      },
      error: () => {
        this.allUsers = [];
        this.recomputeLists();
      },
    });
  }

  private recomputeLists(): void {
    const selectedIds = new Set(this.selectedUsers.map((u) => u._id!));
    this.availableUsers = this.allUsers.filter((u) => !selectedIds.has(u._id!));
    this.availablePage = Math.min(this.availablePage, this.availableTotalPages);
    this.selectedPage = Math.min(this.selectedPage, this.selectedTotalPages);
  }

  addParticipant(u: User): void {
    if (!u?._id) return;
    if (!this.selectedUsers.find((x) => x._id === u._id)) {
      this.selectedUsers.push(u);
      this.newEvent.participants.push(u._id);
      this.recomputeLists();
    }
  }

  removeParticipant(u: User): void {
    if (!u?._id) return;
    this.selectedUsers = this.selectedUsers.filter((x) => x._id !== u._id);
    this.newEvent.participants = this.newEvent.participants.filter(
      (id) => id !== u._id
    );
    this.recomputeLists();
  }

  availablePrevPage(): void {
    if (this.availablePage > 1) this.availablePage--;
  }
  availableNextPage(): void {
    if (this.availablePage < this.availableTotalPages) this.availablePage++;
  }

  selectedPrevPage(): void {
    if (this.selectedPage > 1) this.selectedPage--;
  }
  selectedNextPage(): void {
    if (this.selectedPage < this.selectedTotalPages) this.selectedPage++;
  }

  private composeISOFromDateTime(d: string, t: string): string {
    if (!d && !t) return '';
    const date = d || new Date().toISOString().slice(0, 10);
    const time = t || '00:00';
    return `${date}T${time}`;
  }

  private readonly timeZone = 'Europe/Madrid';

  private toISO(dateStr?: string, timeStr?: string): string | null {
    if (!dateStr) return null;
    const t = timeStr && timeStr.trim() ? timeStr.trim() : '00:00';
    const local = new Date(`${dateStr}T${t}:00`);
    if (isNaN(local.getTime())) return null;
    return local.toISOString();
  }

  private fromISOtoInputs(iso?: any): { dateStr: string; timeStr: string } {
    if (!iso) return { dateStr: '', timeStr: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return { dateStr: `${yyyy}-${mm}-${dd}`, timeStr: `${hh}:${mi}` };
  }

  formatSchedule(iso?: any): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    const noTime =
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      d.getUTCMilliseconds() === 0 &&
      new Date(
        `${this.fromISOtoInputs(iso).dateStr}T00:00:00Z`
      ).toISOString() === new Date(iso).toISOString();

    const base = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: this.timeZone,
    }).format(d);

    if (noTime) {
      return `${base.replace('.', '')} · todo el día`;
    }

    const hm = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.timeZone,
    }).format(d);

    return `${base.replace('.', '')} · ${hm}`;
  }

  setSchedule() {
    const iso = this.toISO(this.dateStr, this.timeStr);
    if (!iso) {
      this.errorMessage = 'Selecciona al menos la fecha válida.';
      return;
    }
    this.newEvent.schedule = iso;
    this.errorMessage = '';
  }

  clearSchedule() {
    this.newEvent.schedule = '';
  }

  getScheduleText = (ev: any) => this.formatSchedule(ev?.schedule);

  selectCategoria(cat: EventoCategoria): void {
    this.newEvent.categoria = cat;
    this.categoriaSearch = cat;
    this.showCategoriaDropdown = false;
  }

  onCategoriaInputFocus(): void {
    this.showCategoriaDropdown = true;
  }

  onCategoriaInputBlur(): void {
    setTimeout(() => {
      this.showCategoriaDropdown = false;
    }, 200);
  }

  onCategoriaSearchChange(): void {
    this.showCategoriaDropdown = true;
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';

    if (!this.newEvent.name || this.newEvent.name.trim().length < 3) {
      this.errorMessage = 'El título es obligatorio (mínimo 3 caracteres).';
      return;
    }

    if (!this.newEvent.schedule && (this.dateStr || this.timeStr)) {
      this.newEvent.schedule = this.composeISOFromDateTime(
        this.dateStr,
        this.timeStr
      );
    }

    if (typeof this.newEvent.schedule !== 'string') {
      this.newEvent.schedule = String(this.newEvent.schedule ?? '');
    }

    if (this.me?._id && !this.newEvent.participants.includes(this.me._id)) {
      this.newEvent.participants.push(this.me._id);
    }

    let lat: number | undefined;
    let lng: number | undefined;

    if (this.latStr && this.latStr.trim() !== '') {
      const parsed = parseFloat(this.latStr);
      if (!Number.isNaN(parsed)) lat = parsed;
    }

    if (this.lngStr && this.lngStr.trim() !== '') {
      const parsed = parseFloat(this.lngStr);
      if (!Number.isNaN(parsed)) lng = parsed;
    }

    const payload: any = {
      name: this.newEvent.name.trim(),
      schedule: this.newEvent.schedule,
      address: this.newEvent.address?.trim() || '',
      participantes: this.newEvent.participants.slice(),
      categoria: this.newEvent.categoria || '',
      lat,
      lng,
      isPrivate: this.newEvent.isPrivate || false,
      invitados: this.newEvent.isPrivate ? this.amigosSeleccionados : []
    } as any as Evento;

    this.saving = true;
    this.eventoService.addEvento(payload).subscribe({
      next: () => {
        this.saving = false;
        this.detectarCambiosProgreso();
        setTimeout(() => {
          this.router.navigate(['/menu']);
        }, 1000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'No se pudo crear el evento.';
      },
    });
  }

  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }

  goToMisEventos(): void {
    this.router.navigate(['/mis-eventos']);
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

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  cargarAmigos(): void {
      const currentUser = this.auth.getCurrentUser();
      const currentUserId = currentUser?._id;
      
      if (!currentUserId) return;

      this.userService.getUserById(currentUserId).subscribe({
        next: (usuario) => {
          if (usuario && usuario.friends) {
            const friendIds = usuario.friends.map((f: any) => 
              typeof f === 'string' ? f : f._id
            );
            
            friendIds.forEach((friendId: string) => {
              this.userService.getUserById(friendId).subscribe({
                next: (amigo) => {
                  if (amigo && !this.amigos.find(a => a._id === amigo._id)) {
                    this.amigos.push(amigo);
                  }
                },
                error: (err) => console.error('Error cargando amigo:', err)
              });
            });
          }
        },
        error: (err) => console.error('Error cargando usuario:', err)
      });
    }

  toggleAmigoSeleccion(amigoId: string | undefined): void {
    if (!amigoId) return;
    const index = this.amigosSeleccionados.indexOf(amigoId);
    if (index > -1) {
      this.amigosSeleccionados.splice(index, 1);
    } else {
      this.amigosSeleccionados.push(amigoId);
    }
  }

  isAmigoSeleccionado(amigoId: string | undefined): boolean {
    if (!amigoId) return false;
    return this.amigosSeleccionados.includes(amigoId);
  }

  seleccionarTodosAmigos(): void {
    this.amigosSeleccionados = this.amigosFiltrados
      .map(a => a._id)
      .filter((id): id is string => id !== undefined);
  }

  deseleccionarTodosAmigos(): void {
    this.amigosSeleccionados = [];
  }
}