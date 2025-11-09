import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, Subscription, fromEvent } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { Evento } from '../../models/evento.model';

type FriendLike = User;

/**
 * Interfaz para las estadísticas de eventos del usuario
 * Contiene contadores y lista de próximos eventos
 */
interface EventStats {
  eventosCreados: number;      // Cantidad de eventos que el usuario creó
  eventosInscritos: number;     // Cantidad de eventos donde está inscrito
  proximosEventos: Evento[];    // Los próximos 3 eventos ordenados por fecha
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private eventoService = inject(EventoService);
  private router = inject(Router);

  // === SEÑALES USUARIO Y AMIGOS ===
  loading = signal(false);
  errorMsg = signal('');
  me = signal<User | null>(null);
  friends = signal<FriendLike[]>([]);

  // === SEÑALES MODAL AÑADIR AMIGOS ===
  showAddModal = signal(false);
  modalError = signal('');
  modalSearch = signal('');
  allUsers = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  mPage = signal(1);
  mPageSize = signal(10);

  // === SEÑALES MODAL SOLICITUDES ===
  showRequestsModal = signal(false);
  requestsLoading = signal(false);
  requestsError = signal('');
  requestsList = signal<User[]>([]);
  sentRequests = signal<any[]>([]);

  // === ✨ NUEVAS SEÑALES PARA EVENTOS ===
  /**
   * Contiene las estadísticas de eventos del usuario:
   * - Eventos que ha creado
   * - Eventos en los que está inscrito
   * - Próximos eventos destacados (máximo 3)
   */
  eventStats = signal<EventStats>({
    eventosCreados: 0,
    eventosInscritos: 0,
    proximosEventos: []
  });
  
  /**
   * Indica si se están cargando los datos de eventos
   */
  loadingEvents = signal(false);

  private visibilitySub?: Subscription;
  private focusSub?: Subscription;
  private friendsPollSub?: Subscription;

  // === COMPUTED PROPERTIES ===
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

  // === MÉTODOS AUXILIARES ===
  private getId(u: User): string {
    return String((u as any)?._id ?? (u as any)?.id ?? '');
  }

  ngOnInit(): void {
    // Suscripción al usuario actual
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (!u) return;

        const isOnline = (u as any).online ?? (u as any).isOnline ?? false;
        this.me.set({ ...(u as any), isOnline });

        const myId = this.getId(u);
        if (!myId) return;

        // Heartbeat inicial
        this.userService.heartbeat(myId).subscribe({
          next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
          error: () => {}
        });

        // Heartbeat cada 30 segundos
        interval(30000)
          .pipe(takeUntil(this.destroy$), switchMap(() => this.userService.heartbeat(myId)))
          .subscribe({
            next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
            error: () => {}
          });

        // ✨ Cargar amigos y estadísticas de eventos
        this.cargarAmigos(myId);
        this.cargarEstadisticasEventos(myId);

        // Listeners de visibilidad y focus
        this.visibilitySub = fromEvent(document, 'visibilitychange')
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            if (document.visibilityState === 'visible') {
              this.cargarAmigos(myId);
              this.cargarEstadisticasEventos(myId);
            }
          });

        this.focusSub = fromEvent(window, 'focus')
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.cargarAmigos(myId);
            this.cargarEstadisticasEventos(myId);
          });

        // Polling cada 60 segundos
        this.friendsPollSub = interval(60000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.cargarAmigos(myId);
            this.cargarEstadisticasEventos(myId);
          });
      });

    // Escuchar cambios en amigos
    this.userService.onFriendsChanged()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const m = this.me();
        if (!m) return;
        const myId = this.getId(m);
        if (myId) this.cargarAmigos(myId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.visibilitySub?.unsubscribe();
    this.focusSub?.unsubscribe();
    this.friendsPollSub?.unsubscribe();
  }

  // === ✨ MÉTODOS DE CARGA DE DATOS ===

  /**
   * 🎯 Carga las estadísticas de eventos del usuario:
   * 1. Número de eventos creados
   * 2. Número de eventos inscritos
   * 3. Próximos 3 eventos destacados ordenados por fecha
   * 
   * @param userId - ID del usuario autenticado
   */
  private cargarEstadisticasEventos(userId: string): void {
    this.loadingEvents.set(true);

    // Llamada al backend que retorna eventos creados e inscritos
    this.eventoService.getMisEventos().subscribe({
      next: (data) => {
        const creados = data.eventosCreados || [];
        const inscritos = data.eventosInscritos || [];

        // Combinar ambas listas para sacar próximos eventos
        const todosEventos = [...creados, ...inscritos];
        const ahora = new Date();
        
        // 📅 Filtrar solo eventos futuros
        const eventosFuturos = todosEventos
          .filter(e => {
            // Obtener la fecha del evento (puede estar en schedule)
            const fechaStr = Array.isArray(e.schedule) ? e.schedule[0] : e.schedule;
            if (!fechaStr) return false;
            return new Date(fechaStr) >= ahora;
          })
          .sort((a, b) => {
            // Ordenar por fecha ascendente (más cercano primero)
            const fechaA = Array.isArray(a.schedule) ? a.schedule[0] : a.schedule;
            const fechaB = Array.isArray(b.schedule) ? b.schedule[0] : b.schedule;
            return new Date(fechaA).getTime() - new Date(fechaB).getTime();
          })
          .slice(0, 3); // Tomar solo los primeros 3

        // Actualizar estado
        this.eventStats.set({
          eventosCreados: creados.length,
          eventosInscritos: inscritos.length,
          proximosEventos: eventosFuturos
        });

        this.loadingEvents.set(false);
      },
      error: (err) => {
        console.error('Error cargando estadísticas de eventos:', err);
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

  // === ✨ MÉTODOS DE NAVEGACIÓN PARA EVENTOS ===

  /**
   * Navega a la vista de explorar eventos
   * Aquí el usuario puede ver todos los eventos y unirse/salir
   */
  goToExplorarEventos(): void {
    this.router.navigate(['/explorar-eventos']);
  }

  /**
   * Navega a la vista de mis eventos (creados e inscritos)
   * Muestra listas separadas de eventos creados y eventos donde está inscrito
   */
  goToMisEventos(): void {
    this.router.navigate(['/mis-eventos']);
  }
  /**
   * Navega a la vista de crear un nuevo evento
   */
  goToCrearEvento(): void {
  this.router.navigate(['/crear-evento']);
  }

  /**
   * Navega al perfil del usuario
   */
  goToPerfil(): void {
    const user = this.me?.();
    if (!user || !user._id) return;
    this.router.navigate(['/perfil'], {
      state: { userId: String(user._id) }
    });
  }

  /**
   * Navega a los detalles de un evento específico
   * @param eventoId - ID del evento a visualizar
   */
  goToEventoDetalle(eventoId: string): void {
    this.router.navigate(['/evento', eventoId]);
  }

  // === ✨ MÉTODOS DE FORMATO PARA FECHAS ===

  /**
   * Formatea una fecha para mostrarla de forma amigable
   * Ejemplo: "15 de Diciembre, 2024"
   * 
   * @param fecha - String o Date con la fecha a formatear
   * @returns String con formato legible
   */
  formatearFecha(fecha: string | Date): string {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('es-ES', opciones);
  }

  /**
   * Formatea una hora para mostrarla
   * Ejemplo: "14:30"
   * 
   * @param fecha - String o Date con la fecha/hora a formatear
   * @returns String con formato HH:MM
   */
  formatearHora(fecha: string | Date): string {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // === MÉTODOS DE SESIÓN ===

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

  // === MÉTODOS DE GESTIÓN DE AMIGOS ===

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

  // === MODAL AÑADIR AMIGOS ===

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
    const val = sel?.value ? Number(sel.value) : 10;
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

  // === MODAL SOLICITUDES ===

  refreshRequests(): void {
    const me = this.me();
    if (!me?._id) return;

    this.requestsLoading?.set(true);
    this.requestsError?.set('');

    this.userService.getFriendRequests(String(me._id)).subscribe({
      next: (list) => {
        this.requestsList?.set(list ?? []);
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
          this.cargarAmigos(myId);
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
}