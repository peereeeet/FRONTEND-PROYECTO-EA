import { Component, OnDestroy, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, fromEvent, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { ThemeService } from '../../services/theme.service';
import { Router, RouterModule } from '@angular/router';
import { ChatbotStateService } from '../../services/chatbot-state.service';
import { User } from '../../models/user.model';
import { Evento, CATEGORIAS_EVENTO, EventoCategoria } from '../../models/evento.model';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SocketService } from '../../services/socket.service';
import { ChatMessage } from '../../models/user.model';
import * as maplibregl from 'maplibre-gl';
import { RewardNotificationService } from '../../services/reward-notification.service';
import { GamificacionService } from '../../services/gamificacion.service';
import { RewardNotificationComponent } from '../reward-notification/reward-notification.component';

type FriendLike = User;

interface EventStats {
  eventosCreados: number;     
  eventosInscritos: number;    
  proximosEventos: Evento[];   
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RewardNotificationComponent, RouterModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private eventoService = inject(EventoService);
  private router = inject(Router);
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;
  private socketService = inject(SocketService);
  private chatbotStateService = inject(ChatbotStateService);
  private readonly EVENT_INVITE_PREFIX = '__EVENT_INVITE__|';
  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef<HTMLDivElement>;
  private userLocationMarker?: maplibregl.Marker;

  loading = signal(false);
  errorMsg = signal('');
  me = signal<User | null>(null);
  friends = signal<FriendLike[]>([]);

  showAddModal = signal(false);
  modalError = signal('');
  modalSearch = signal('');
  allUsers = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  mPage = signal(1);
  mPageSize = signal(3);

  showRequestsModal = signal(false);
  requestsLoading = signal(false);
  requestsError = signal('');
  requestsList = signal<User[]>([]);
  sentRequests = signal<any[]>([]);

  private socketsInitialized = false;

  eventStats = signal<EventStats>({
    eventosCreados: 0,
    eventosInscritos: 0,
    proximosEventos: []
  });
  loadingEvents = signal(false);

  private visibilitySub?: Subscription;
  private focusSub?: Subscription;
  private friendsPollSub?: Subscription;
  newFriendRequests = signal(0);
  invitacionesPendientes = signal(0);

  private progresoInicial: any = null;

  fPage: number = 1;
  fPageSize: number = 3;

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  chatOpen = signal(false);
  chatFriend = signal<any | null>(null);
  chatMessages = signal<ChatMessage[]>([]);
  chatLoading = signal(false);
  chatError = signal('');
  chatText = signal('');
  private chatSocketsInitialized = false;
  eventInviteMembership: Record<string, boolean> = {};
  eventWaitlistStatus: Record<string, boolean> = {};
  eventIsFullStatus: Record<string, boolean> = {};

  allEventos: Evento[] = [];
  eventosFiltrados: Evento[] = [];
  eventos: Evento[] = [];
  
  loadingMap = false;
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

  activeEventTab: 'map' | 'search' = 'map';
  searchTerm = signal('');
  searchDateFrom = signal('');
  searchDateTo = signal('');
  searchCategoria = signal('');
  searchCategoriaSearch: string = '';
  searchShowCategoriaDropdown = false;
  searchCategoriasFiltradas: EventoCategoria[] = [];
  searchEventos: Evento[] = [];
  searchPage = 1;
  searchPageSize = 6;
  searchTotalItems = 0;
  searchTotalPages = 1;
  loadingSearch = false;
  categoriasDisponibles = CATEGORIAS_EVENTO;

  showConfirmRemove = signal(false);
  friendToRemove = signal<any | null>(null);
  removingFriend = signal(false);

  get mTotalPages(): number {
    const n = this.filteredUsers().length;
    return Math.max(1, Math.ceil(n / this.mPageSize()));
  }

  get modalPageItems(): User[] {
    const page = this.mPage();
    const size = this.mPageSize();
    const start = (page - 1) * size;
    return this.filteredUsers().slice(start, start + size);
  }

  meStatusText = computed(() => {
    const m = this.me();
    if (!m) return 'Desconectado';
    return (m as any).isOnline ? 'En línea' : 'Desconectado';
  });

  private getId(u: User): string {
    return String((u as any)?._id ?? (u as any)?.id ?? '');
  }

  constructor(private authService: AuthService,
    private translate: TranslateService,
    private rewardService: RewardNotificationService,
  private gamificacionService: GamificacionService
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
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (!u) return;

        const isOnline = (u as any).online ?? (u as any).isOnline ?? false;
        this.me.set({ ...(u as any), isOnline });

        const myId = this.getId(u);
        if (!myId) return;

        this.refreshRequests();
        this.refreshSentRequests();
        this.cargarProgresoInicial();

        this.userService.setOnline(myId).subscribe({
          next: (res) => {
            this.me.update(m => m ? ({ ...(m as any), isOnline: res.online }) : m);
          },
          error: (err) => {
            console.error('Error marcando usuario online al entrar en menú', err);
          }
        });

        this.userService.getUserDetail(myId).subscribe({
          next: (fresh) => {
            const isOnlineFresh = (fresh as any).online ?? (fresh as any).isOnline ?? false;
            this.me.set({ ...(fresh as any), isOnline: isOnlineFresh });
          },
          error: () => {
          }
        });

        this.socketService.connect(myId);
        this.initFriendOnlineListeners(myId);
        this.initChatListener(myId);
        this.cargarAmigos(myId);
        this.cargarEstadisticasEventos(myId);
        this.searchCategoriasFiltradas = [...this.categoriasDisponibles];

        this.visibilitySub = fromEvent(document, 'visibilitychange')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (document.visibilityState === 'visible') {
            this.userService.heartbeat(myId).subscribe({
              next: (res) => {
                this.me.update(m => m ? ({ ...(m as any), isOnline: res.online }) : m);
              },
              error: (err) => {
                console.error('Error en heartbeat (visibility)', err);
              }
            });
            this.cargarAmigos(myId);
            this.cargarEstadisticasEventos(myId);
          }
        });

        this.focusSub = fromEvent(window, 'focus')
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.userService.heartbeat(myId).subscribe({
              next: (res) => {
                this.me.update(m => m ? ({ ...(m as any), isOnline: res.online }) : m);
              },
              error: (err) => {
                console.error('Error en heartbeat (focus)', err);
              }
            });
            this.cargarAmigos(myId);
            this.cargarEstadisticasEventos(myId);
        });

        this.socketService
          .onFriendRequestReceived()
          .pipe(takeUntil(this.destroy$))
          .subscribe((payload) => {
            console.log('Nueva solicitud de amistad recibida vía WS', payload);
            this.newFriendRequests.update(v => v + 1);
            this.requestsLoading.set(true);

            if (this.showRequestsModal()) {
              this.refreshRequests();
            }
          });

        this.friendsPollSub = interval(2000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            const m = this.me();
            const myId = m ? this.getId(m as any) : '';
            if (!myId) return;

            this.userService.getFriendRequests(myId).subscribe({
              next: (list) => {
                const count = (list || []).length;
                if (this.newFriendRequests() !== count) {
                  this.newFriendRequests.set(count);
                }
              },
              error: (err) => {
                console.error('Error refrescando solicitudes (polling)', err);
              }
            });
          });
      });

    this.userService.onFriendsChanged()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const m = this.me();
        if (!m) return;
        const myId = this.getId(m);
        if (myId) this.cargarAmigos(myId);
      });

    this.cargarInvitacionesPendientes();

    this.socketService.onPlazaDisponible().subscribe({
      next: (data) => {
        this.errorMessage = '¡Has sido añadido automáticamente al evento!';
        this.loadingEvents();
      }
    });

    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cargarInvitacionesPendientes();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.visibilitySub?.unsubscribe();
    this.focusSub?.unsubscribe();
    this.friendsPollSub?.unsubscribe();
    this.socketService.disconnect();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private cargarProgresoInicial(): void {
    const m = this.me();
    if (!m?._id) return;

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

  private detectarCambiosProgreso(accion: 'unirseEvento' | 'hacerAmigo'): void {
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

          const puntosGanados = this.rewardService.getPuntosAccion(accion);

          this.rewardService.showReward({
            puntosGanados,
            accion,
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
            accion,
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

  private cargarEstadisticasEventos(userId: string): void {
    this.loadingEvents.set(true);

    this.eventoService.getMisEventos().subscribe({
      next: (data) => {
        const creados = data.eventosCreados || [];
        const inscritos = data.eventosInscritos || [];

        const todosEventos = [...creados, ...inscritos];
        const ahora = new Date();
        const proximos = todosEventos
          .map(e => {
            const s = Array.isArray(e.schedule) ? e.schedule[0] : e.schedule;
            return {
              ...e,
              fechaObj: s ? new Date(s) : new Date(0)
            };
          })
          .filter(e => e.fechaObj > ahora)
          .sort((a, b) => a.fechaObj.getTime() - b.fechaObj.getTime())
          .slice(0, 3);

        this.eventStats.set({
          eventosCreados: creados.length,
          eventosInscritos: inscritos.length,
          proximosEventos: proximos as Evento[]
        });

        this.loadingEvents.set(false);
      },
      error: (err) => {
        this.loadingEvents.set(false);
      }
    });
  }

  private cargarAmigos(userId: string): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.userService.listFriends(userId, 1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          const arr = (page?.data ?? []).map(u => ({
            ...u,
            isOnline: (u as any).online ?? (u as any).isOnline ?? false
          }));
          this.friends.set(arr);
          this.loading.set(false);
        },
        error: err => {
          this.friends.set([]);
          this.errorMsg.set(err?.error?.message || 'Error cargando amigos');
          this.loading.set(false);
        }
      });
  }

  goToMisEventos(): void {
    this.router.navigate(['/mis-eventos']);
  }
  
  goToCrearEvento(): void {
  this.router.navigate(['/crear-evento']);
  }

  goToPerfil(): void {
    const user = this.me?.();
    if (!user || !user._id) return;
    this.router.navigate(['/perfil'], {
      state: { userId: String(user._id) }
    });
  }
  openChatbot(): void {
  this.chatbotStateService.openChat();
}

  goToEventoDetalle(eventoId: string): void {
    this.router.navigate(['/evento', eventoId]);
  }

  formatearFecha(fecha: string | Date): string {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', opciones);
  }

  formatearHora(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onLogout(): void {
    const meUser = this.me();
    const myId = meUser ? this.getId(meUser) : '';

    if (meUser) this.me.set({ ...(meUser as any), isOnline: false });

    if (myId) {
      this.userService.setOffline(myId).subscribe({
        next: () => {
          this.auth.logout();
          this.router.navigate(['login']);
        },
        error: () => {
          this.auth.logout();
          this.router.navigate(['login']);
        }
      });
    } else {
      this.auth.logout();
      this.router.navigate(['login']);
    }
  }

  quitar(friendId: string): void {
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;

    this.userService.removeFriend(myId, friendId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cargarAmigos(myId);
          this.userService.notifyFriendsChanged();
        },
        error: () => {}
      });
  }

  openAddFriendsModal(): void {
    this.modalError.set('');
    this.modalSearch.set('');
    this.mPage.set(1);
    this.showAddModal.set(true);
    this.loadModalUsers();
    this.refreshRequests();
    this.refreshSentRequests();
  }

  closeAddFriendsModal(): void {
    this.showAddModal.set(false);
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;
    this.cargarAmigos(myId);
  }

  onModalSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.modalSearch.set(input?.value ?? '');
    this.applyModalFilter();
    this.mPage.set(1);
  }

  onPageSizeChange(event: Event): void {
    const sel = event.target as HTMLSelectElement | null;
    const val = sel?.value ? Number(sel.value) : 4;
    this.mPageSize.set(val);
    this.mPage.set(1);
  }

  buscarPersonas(): void {
    this.applyModalFilter();
    this.mPage.set(1);
  }

  private loadModalUsers(): void {
    this.userService.getUsers(1, 200, '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          const arr = (page?.data ?? []).map(u => ({
            ...u,
            isOnline: (u as any).online ?? (u as any).isOnline ?? false
          }));

          const nonAdmins = arr.filter(u => u.rol !== 'admin');
          this.allUsers.set(nonAdmins);
          this.applyModalFilter();
        },
        error: err => {
          this.modalError.set(err?.error?.message || 'No se pudo cargar la lista de usuarios');
          this.allUsers.set([]);
          this.filteredUsers.set([]);
        }
      });
  }

  isPendingFrom(id: string): boolean {
    try {
      const list = this.requestsList?.() ?? [];
      return list.some((u: any) => String(u._id) === String(id));
    } catch {
      return false;
    }
  }

  isPendingTo(id: string): boolean {
    const list = this.sentRequests() ?? [];
    return list.some(u => String(u._id) === String(id));
  }

  private applyModalFilter(): void {
    const term = (this.modalSearch() ?? '').toLowerCase().trim();
    const meUser = this.me();
    const myId = meUser ? this.getId(meUser) : '';
    const amigoIds = new Set(this.friends().map(f => this.getId(f)));

    const filtered = this.allUsers()
      .filter(u => this.getId(u) !== myId && !amigoIds.has(this.getId(u)))
      .filter(u => !term || u.username.toLowerCase().includes(term) || u.gmail.toLowerCase().includes(term));

    this.filteredUsers.set(filtered);
  }

  addFromModal(userId?: string): void {
    if (!userId) return;

    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;

    this.userService
      .sendFriendRequest(myId, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.filteredUsers.set(
            this.filteredUsers().filter((u) => this.getId(u) !== userId)
          );
          this.allUsers.set(
            this.allUsers().filter((u) => this.getId(u) !== userId)
          );
          this.refreshSentRequests();
          this.modalError.set('Solicitud de amistad enviada ✅');
        },
        error: (err) => {
          this.modalError.set(
            err?.error?.error || 'No se pudo enviar la solicitud.'
          );
        },
      });
  }

  refreshRequests(): void {
    const me = this.me();
    if (!me?._id) return;

    this.requestsLoading?.set(true);
    this.requestsError?.set('');

    this.userService.getFriendRequests(String(me._id)).subscribe({
      next: (list) => {
        this.requestsList?.set(list ?? []);
        this.newFriendRequests.set(list?.length ?? 0);
        this.requestsLoading?.set(false);
      },
      error: (err) => {
        this.requestsError?.set(err?.error?.message || 'Error cargando solicitudes');
        this.requestsLoading?.set(false);
      }
    });
  }

  refreshSentRequests(): void {
    const me = this.me();
    if (!me?._id) return;

    this.userService.getSentRequests(String(me._id)).subscribe({
      next: (res) => {
        this.sentRequests.set(res?.data ?? []);
      },
      error: () => {
        this.sentRequests.set([]);
      }
    });
  }

  openRequestsModal(): void {
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;

    this.requestsError.set('');
    this.requestsLoading.set(true);
    this.showRequestsModal.set(true);

    this.userService
      .getFriendRequests(myId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.requestsList.set(users);
          this.requestsLoading.set(false);
        },
        error: (err) => {
          this.requestsError.set(
            err?.error?.message || 'Error cargando solicitudes'
          );
          this.requestsList.set([]);
          this.requestsLoading.set(false);
        },
      });
  }

  closeRequestsModal(): void {
    this.showRequestsModal.set(false);
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;
    this.cargarAmigos(myId);
    this.refreshRequests(); 
  }

  acceptRequest(userId: string): void {
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;

    this.userService
      .acceptFriendRequest(myId, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.requestsList.set(
            this.requestsList().filter((u) => this.getId(u) !== userId)
          );
          this.newFriendRequests.set(this.requestsList().length);
          this.cargarAmigos(myId);
          this.detectarCambiosProgreso('hacerAmigo');
        },
        error: () => this.requestsError.set('Error al aceptar la solicitud'),
      });
  }

  rejectRequest(userId: string): void {
    const meUser = this.me();
    if (!meUser) return;
    const myId = this.getId(meUser);
    if (!myId) return;

    this.userService
      .rejectFriendRequest(myId, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.requestsList.set(
            this.requestsList().filter((u) => this.getId(u) !== userId)
          );
          this.newFriendRequests.set(this.requestsList().length);
        },
        error: () => this.requestsError.set('Error al rechazar la solicitud'),
      });
  }

  modalPrev(): void {
    if (this.mPage() > 1) this.mPage.set(this.mPage() - 1);
  }

  modalNext(): void {
    if (this.mPage() < this.mTotalPages) this.mPage.set(this.mPage() + 1);
  }

  private _friendsArray(): any[] {
    const f: any = (this as any).friends;
    try {
      const arr = typeof f === 'function' ? f() : Array.isArray(f) ? f : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  fTotalPages(): number {
    const total = this._friendsArray().length;
    return Math.max(1, Math.ceil(total / this.fPageSize));
  }

  friendsPaged(): any[] {
    const arr = this._friendsArray();
    const start = (this.fPage - 1) * this.fPageSize;
    return arr.slice(start, start + this.fPageSize);
  }

  friendsPrev(): void {
    if (this.fPage > 1) this.fPage--;
  }

  friendsNext(): void {
    const max = this.fTotalPages();
    if (this.fPage < max) this.fPage++;
  }

  setFriendsPageSize(val: number): void {
    this.fPageSize = Number(val) || 3;
    this.fPage = 1;
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

  private initFriendOnlineListeners(myId: string): void {
    if (this.socketsInitialized) return;
    this.socketsInitialized = true;

    this.socketService
      .onUserOnline()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId }) => {
        if (userId === myId) {
          const me = this.me();
          if (me) {
            this.me.set({ ...me, isOnline: true });
          }
        }

        this.friends.update(list =>
          list.map(f =>
            f._id === userId
              ? { ...f, isOnline: true }
              : f
          )
        );
      });

    this.socketService
      .onUserOffline()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ userId }) => {
        if (userId === myId) {
          const me = this.me();
          if (me) {
            this.me.set({ ...me, isOnline: false });
          }
        }
        this.friends.update(list =>
          list.map(f =>
            f._id === userId
              ? { ...f, isOnline: false }
              : f
        )
      );
    });
  }

  private initChatListener(myId: string): void {
    if (this.chatSocketsInitialized) return;
    this.chatSocketsInitialized = true;

    this.socketService
      .onChatMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((msg) => {
        const me = this.me();
        const friend = this.chatFriend();
        if (!me || !friend) return;

        const pair = [me._id, friend._id];
        if (pair.includes(msg.from) && pair.includes(msg.to)) {
          this.chatMessages.update(list => [...list, msg]);
          this.scrollChatToBottom();
        }
      });
  }

  openChat(friend: any): void {
    const me = this.me();
    if (!me || !friend || !friend._id || !me._id) return;

    this.chatFriend.set(friend);
    this.chatOpen.set(true);
    this.chatLoading.set(true);
    this.chatError.set('');
    this.chatMessages.set([]);

    this.socketService.joinChat(me._id, friend._id);

    this.userService.getChatWithFriend(me._id, friend._id).subscribe({
      next: (messages) => {
        this.chatMessages.set(messages || []);
        this.chatLoading.set(false);
        this.scrollChatToBottom();
      },
      error: (err) => {
        this.chatError.set('No se pudo cargar la conversación');
        this.chatLoading.set(false);
      }
    });
  }

  closeChat(): void {
    this.chatOpen.set(false);
    this.chatFriend.set(null);
    this.chatMessages.set([]);
    this.chatText.set('');
  }

  onChatInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.chatText.set(value);
  }

  sendChat(): void {
    const text = this.chatText().trim();
    if (!text) return;

    const me = this.me();
    const friend = this.chatFriend();
    if (!me || !friend || !me._id || !friend._id) return;

    this.chatText.set('');

    this.socketService.sendChatMessage(me._id, friend._id, text);
  }

  isEventInvite(msg: ChatMessage): boolean {
    return typeof msg?.text === 'string' &&
          msg.text.startsWith(this.EVENT_INVITE_PREFIX);
  }

  getEventInviteData(msg: ChatMessage): { id: string; name: string } {
    if (!this.isEventInvite(msg)) {
      return { id: '', name: msg?.text || '' };
    }
    const payload = msg.text.substring(this.EVENT_INVITE_PREFIX.length);
    const [id, name] = payload.split('|');
    return {
      id: id || '',
      name: name || ''
    };
  }

  isCurrentUserInInvitedEvent(msg: ChatMessage): boolean {
    const data = this.getEventInviteData(msg);
    const eventId = data.id;
    const meUser = this.me();

    if (!eventId || !meUser?._id) {
      return false;
    }

    if (Object.prototype.hasOwnProperty.call(this.eventInviteMembership, eventId)) {
      return this.eventInviteMembership[eventId];
    }

    this.eventoService.getEventoById(eventId).subscribe({
      next: (evento) => {
        const myId = String(meUser._id);
        const participantes = (evento?.participantes || []).map((p: any) =>
          typeof p === 'string' ? p : String(p._id)
        );
        const listaEspera = (evento?.listaEspera || []).map((p: any) =>
          typeof p === 'string' ? p : String(p._id)
        );
        
        const joined = participantes.includes(myId);
        const inWaitlist = listaEspera.includes(myId);
        const isFull = evento.maxParticipantes 
          ? participantes.length >= evento.maxParticipantes 
          : false;
        
        this.eventInviteMembership[eventId] = joined;
        this.eventWaitlistStatus[eventId] = inWaitlist;
        this.eventIsFullStatus[eventId] = isFull;
      },
      error: (err) => {
        this.eventInviteMembership[eventId] = false;
        this.eventWaitlistStatus[eventId] = false;
        this.eventIsFullStatus[eventId] = false;
      }
    });

    return false;
  }

  isCurrentUserInWaitlistForInvitedEvent(msg: ChatMessage): boolean {
    const data = this.getEventInviteData(msg);
    const eventId = data.id;

    if (!eventId) {
      return false;
    }

    return this.eventWaitlistStatus[eventId] || false;
  }

  isInvitedEventFull(msg: ChatMessage): boolean {
    const data = this.getEventInviteData(msg);
    const eventId = data.id;

    if (!eventId) {
      return false;
    }

    return this.eventIsFullStatus[eventId] || false;
  }

  leaveWaitlistFromInvite(msg: ChatMessage): void {
    const data = this.getEventInviteData(msg);
    if (!data.id) return;

    this.eventoService.leaveWaitlist(data.id).subscribe({
      next: (response: any) => {
        alert('Has salido de la lista de espera');
        this.eventInviteMembership[data.id] = false;
        this.eventWaitlistStatus[data.id] = false;
        
        const meUser = this.me();
        if (meUser?._id) {
          this.eventoService.getEventoById(data.id).subscribe({
            next: (evento) => {
              const participantes = (evento?.participantes || []).map((p: any) =>
                typeof p === 'string' ? p : String(p._id)
              );
              const isFull = evento.maxParticipantes 
                ? participantes.length >= evento.maxParticipantes 
                : false;
              this.eventIsFullStatus[data.id] = isFull;
            }
          });
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Error al salir de la lista de espera');
      }
    });
  }

  joinFromInvite(msg: ChatMessage): void {
    const data = this.getEventInviteData(msg);
    if (!data.id) return;

    this.eventoService.joinEvento(data.id).subscribe({
      next: (response: any) => {
        if (response.enListaEspera) {
          this.eventInviteMembership[data.id] = false;
          this.eventWaitlistStatus[data.id] = true;
          alert(response.message || 'Has sido añadido a la lista de espera del evento');
        } else {
          this.eventInviteMembership[data.id] = true;
          this.eventWaitlistStatus[data.id] = false;
          alert(response.message || 'Te has unido al evento correctamente');
        }
        
        if (response.evento) {
          const evento = response.evento;
          const participantes = (evento?.participantes || []).map((p: any) =>
            typeof p === 'string' ? p : String(p._id)
          );
          const isFull = evento.maxParticipantes 
            ? participantes.length >= evento.maxParticipantes 
            : false;
          this.eventIsFullStatus[data.id] = isFull;
        }

        const meUser = this.me();
        if (meUser) {
          const myId = this.getId(meUser);
          if (myId) {
            this.cargarEstadisticasEventos(myId);
          }
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Error al unirse al evento');
      }
    });
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const el = this.chatMessagesContainer?.nativeElement;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 500);
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
        this.centerMapOnUserLocation();
      });
  
      this.map.on('moveend', () => {
        this.actualizarListaSegunMapa();
      });
    }

    private centerMapOnUserLocation(): void {
    if (!this.map) {
      console.warn('[MENU] El mapa aún no está inicializado.');
      return;
    }

    if (!('geolocation' in navigator)) {
      console.warn('[MENU] El navegador no soporta geolocalización.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        const userLngLat: [number, number] = [lng, lat];
        this.map!.setCenter(userLngLat);
        this.map!.setZoom(13);

        if (this.userLocationMarker) {
          this.userLocationMarker.setLngLat(userLngLat);
        } else {
          this.userLocationMarker = new maplibregl.Marker({
            color: '#007bff'
          })
            .setLngLat(userLngLat)
            .addTo(this.map!);
        }

        console.log('[MENU] Mapa centrado en la ubicación del usuario', userLngLat);
      },
      (error) => {
        console.warn('[MENU] Error al obtener geolocalización:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
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
        this.loadingMap = true;
      }
      this.errorMessage = '';
  
      const finalizar = () => {
        if (!fromMapMove) {
          this.loadingMap = false;
        }
      };
  
      if (!bounds) {
        this.eventoService.getUpcomingEventos(this.page, this.pageSize).subscribe({
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
      this.loadingMap = true;
      this.errorMessage = '';
  
      this.eventoService.getEventosVisibles().subscribe({
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
  
          this.loadingMap = false;
  
          this.page = 1;
          this.fetchEventosForCurrentView();
        },
        error: (err) => {
          this.loadingMap = false;
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
        next: (response: any) => {
          const idx = this.allEventos.findIndex(e => e._id === ev._id);
          if (idx !== -1) {
            this.allEventos[idx] = response.evento || response;
          }
          
          this.actualizarListaSegunMapa();
          this.pintarMarcadores();
          
          if (this.selectedEvent && this.selectedEvent._id === ev._id) {
            this.selectedEvent = response.evento || response;
          }

          if (response.enListaEspera) {
            this.errorMessage = response.message || 'Has sido añadido a la lista de espera';
          } else {
            this.errorMessage = response.message || 'Te has unido al evento';
            this.detectarCambiosProgreso('unirseEvento');
          }

          const meUser = this.me();
          if (meUser) {
            const myId = this.getId(meUser);
            if (myId) {
              this.cargarEstadisticasEventos(myId);
            }
          }
        },
        error: (err) => {
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

  openConfirmRemoveFriend(friend: any) {
    this.friendToRemove.set(friend);
    this.showConfirmRemove.set(true);
  }

  closeConfirmRemoveFriend() {
    this.showConfirmRemove.set(false);
    this.friendToRemove.set(null);
  }

  confirmRemoveFriend() {
    const friend = this.friendToRemove();
    if (!friend || this.removingFriend()) return;

    this.removingFriend.set(true);

    try {
      this.quitar(friend._id!);

    } catch (err) {
      console.error("Error al quitar amigo:", err);
    } finally {
      this.removingFriend.set(false);
      this.closeConfirmRemoveFriend();
    }
  }

  switchEventTab(tab: 'map' | 'search'): void {
    this.activeEventTab = tab;

    if (tab === 'map') {
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          this.fetchEventosForCurrentView(false);
        }
      }, 100);
    }

    if (tab === 'search') {
      this.searchPage = 1;
      this.performSearch();
    }
  }

  performSearch(): void {
    this.loadingSearch = true;
    this.errorMessage = '';

    const term      = this.searchTerm().trim();
    const from      = this.searchDateFrom();
    const to        = this.searchDateTo();
    const categoria = this.searchCategoria ? this.searchCategoria() : '';

    if (!term && !from && !to && !categoria) {
      this.eventoService
        .getUpcomingEventos(this.searchPage, this.searchPageSize)
        .subscribe({
          next: (response) => {
            const lista = response.data || [];
            this.searchEventos    = this.normalizeAndSortEventos(lista);
            this.searchPage       = response.page;
            this.searchTotalPages = response.totalPages;
            this.searchTotalItems = response.totalItems;
            this.loadingSearch    = false;
          },
          error: (err) => {
            console.error('Error al cargar eventos futuros (getUpcomingEventos):', err);
            this.errorMessage = 'Error al cargar eventos futuros';
            this.loadingSearch = false;
          }
        });
      return;
    }

    this.eventoService
      .searchEventos(term, from, to, categoria, this.searchPage, this.searchPageSize)
      .subscribe({
        next: (response) => {
          const lista = response.data || [];
          this.searchEventos    = this.normalizeAndSortEventos(lista);
          this.searchPage       = response.page;
          this.searchTotalPages = response.totalPages;
          this.searchTotalItems = response.totalItems;
          this.loadingSearch    = false;
        },
        error: (err) => {
          console.error('Error en búsqueda de eventos:', err);
          this.errorMessage = 'Error al buscar eventos';
          this.loadingSearch = false;
        }
      });
  }

  onSearchCategoriaChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value as EventoCategoria | '';
    this.searchCategoria.set(value);
    this.searchPage = 1;
    this.performSearch();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchDateFrom.set('');
    this.searchDateTo.set('');
    this.searchCategoria.set('');
    this.searchCategoriaSearch = '';
    this.searchCategoriasFiltradas = [...this.categoriasDisponibles];
    this.searchPage = 1;
    this.performSearch();
  }

  onSearchCategoriaInputFocus(): void {
    this.searchShowCategoriaDropdown = true;
    this.filterSearchCategorias();
  }

  onSearchCategoriaInputBlur(): void {
    setTimeout(() => {
      this.searchShowCategoriaDropdown = false;
    }, 150);
  }

  onSearchCategoriaSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchCategoriaSearch = value;
    this.filterSearchCategorias();
  }

  private filterSearchCategorias(): void {
    const q = this.searchCategoriaSearch.toLowerCase().trim();
    if (!q) {
      this.searchCategoriasFiltradas = [...this.categoriasDisponibles];
    } else {
      this.searchCategoriasFiltradas = this.categoriasDisponibles.filter(cat =>
        cat.toLowerCase().includes(q)
      );
    }
  }

  selectSearchCategoria(cat: EventoCategoria | ''): void {
    this.searchCategoria.set(cat || '');
    this.searchCategoriaSearch = cat || '';
    this.searchShowCategoriaDropdown = false;
    this.searchPage = 1;
    this.performSearch();
  }

  onSearchTermInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.searchPage = 1;
  }

  onSearchDateFromInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchDateFrom.set(target.value);
    this.searchPage = 1;
  }

  onSearchDateToInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchDateTo.set(target.value);
    this.searchPage = 1;
  }

  searchPrevPage(): void {
    if (this.searchPage > 1) {
      this.searchPage--;
      this.performSearch();
    }
  }

  searchNextPage(): void {
    if (this.searchPage < this.searchTotalPages) {
      this.searchPage++;
      this.performSearch();
    }
  }

  isUserInSearchEvento(evento: Evento): boolean {
    const userId = this.currentUserId;
    if (!userId || !evento.participantes) return false;
    return evento.participantes.some((p: any) => {
      const pid = typeof p === 'string' ? p : (p._id || p.id);
      return pid === userId;
    });
  }

  isUserCreatorSearch(evento: Evento): boolean {
    const userId = this.currentUserId;
    if (!userId) return false;
    const creadorId = typeof evento.creador === 'string' 
      ? evento.creador 
      : (evento.creador as any)?._id || (evento.creador as any)?.id;
    return creadorId === userId;
  }

  joinSearchEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.joinEvento(evento._id as string).subscribe({
      next: (response: any) => {
        const idx = this.searchEventos.findIndex(e => e._id === evento._id);
        if (idx !== -1) {
          this.searchEventos[idx] = response.evento || response;
        }
        
        this.performSearch();
        
        if (response.enListaEspera) {
          this.errorMessage = response.message || 'Has sido añadido a la lista de espera';
        } else {
          this.errorMessage = response.message || 'Te has unido al evento';
          this.detectarCambiosProgreso('unirseEvento');
        }
        
        const m = this.me();
        if (m) {
          const myId = this.getId(m);
          if (myId) this.cargarEstadisticasEventos(myId);
        }
      },
      error: (err) => {
        console.error('Error al unirse al evento:', err);
        this.errorMessage = err?.error?.message || 'Error al unirse al evento';
      }
    });
  }

  leaveSearchEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.leaveEvento(evento._id as string).subscribe({
      next: () => {
        this.performSearch();
        const m = this.me();
        if (m) {
          const myId = this.getId(m);
          if (myId) this.cargarEstadisticasEventos(myId);
        }
      },
      error: (err) => {
        console.error('Error al salir del evento:', err);
        this.errorMessage = 'Error al salir del evento';
      }
    });
  }

  openSearchEventModal(evento: Evento): void {
    this.selectedEvent = evento;
    this.showEventModal = true;
  }

  getCreadorNameSearch(evento: Evento): string {
    if (!evento.creador) return '-';
    const c = evento.creador as any;
    return c.username || c.gmail || '-';
  }

  getScheduleTextSearch(evento: Evento): string {
    if (!evento.schedule) return '-';
    const s = Array.isArray(evento.schedule) ? evento.schedule[0] : evento.schedule;
    if (!s) return '-';
    try {
      const d = new Date(s);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return s.toString();
    }
  }

  private getScheduleDate(evento: any): Date | null {
    if (!evento || !evento.schedule) return null;

    const raw = Array.isArray(evento.schedule)
      ? evento.schedule[0]
      : evento.schedule;

    if (!raw) return null;

    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  private normalizeAndSortEventos(list: any[]): any[] {
    const now = new Date();

    return (list || [])
      .map(e => ({ e, d: this.getScheduleDate(e) }))
      .filter(x => x.d && x.d >= now)
      .sort((a, b) => a.d!.getTime() - b.d!.getTime())
      .map(x => x.e);
  }

  cargarInvitacionesPendientes(): void {
    this.eventoService.getPendingInvitations().subscribe({
      next: (response) => {
        this.invitacionesPendientes.set(response.count || 0);
      },
      error: (err) => {
        console.error('Error cargando invitaciones pendientes:', err);
      }
    });
  }

  navegarInvitaciones(): void {
    this.router.navigate(['/invitaciones']).then(() => {
      setTimeout(() => this.cargarInvitacionesPendientes(), 500);
    });
  }

  isEventoLleno(evento: Evento): boolean {
    if (!evento.maxParticipantes) return false;
    const participantes = evento.participantes?.length || 0;
    return participantes >= evento.maxParticipantes;
  }

  estaEnListaEspera(evento: Evento): boolean {
    if (!this.me()?._id) return false;
    if (!evento.listaEspera) return false;
    
    const myId = this.getId(this.me()!);
    
    return evento.listaEspera.some((user: any) => {
      return typeof user === 'string' 
        ? user === myId 
        : user._id === myId;
    });
  }

  estaEnListaEsperaSearch(evento: Evento): boolean {
    if (!this.me()?._id) return false;
    if (!evento.listaEspera) return false;
    
    const myId = this.getId(this.me()!);
    
    return evento.listaEspera.some((user: any) => {
      return typeof user === 'string' 
        ? user === myId 
        : user._id === myId;
    });
  }

  leaveWaitlist(ev: Evento): void {
    if (!ev._id) return;

    this.eventoService.leaveWaitlist(ev._id).subscribe({
      next: (response: any) => {
        const idx = this.allEventos.findIndex(e => e._id === ev._id);
        if (idx !== -1) {
          this.allEventos[idx] = response.evento || response;
        }
        
        this.actualizarListaSegunMapa();
        this.pintarMarcadores();
        
        if (this.selectedEvent && this.selectedEvent._id === ev._id) {
          this.selectedEvent = response.evento || response;
        }

        this.errorMessage = 'Has salido de la lista de espera';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al salir de lista de espera.';
      }
    });
  }

  leaveWaitlistSearch(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.leaveWaitlist(evento._id).subscribe({
      next: (response: any) => {
        const idx = this.searchEventos.findIndex(e => e._id === evento._id);
        if (idx !== -1) {
          this.searchEventos[idx] = response.evento || response;
        }
        
        this.performSearch();
        this.errorMessage = 'Has salido de la lista de espera';
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al salir de lista de espera.';
      }
    });
  }
}