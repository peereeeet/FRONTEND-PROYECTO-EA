import { Component, OnDestroy, OnInit, computed, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { ThemeService } from '../../services/theme.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { Evento } from '../../models/evento.model';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SocketService } from '../../services/socket.service';
import { ChatMessage } from '../../models/user.model';
import { logger } from '../../utils/logger';

type FriendLike = User;

interface EventStats {
  eventosCreados: number;     
  eventosInscritos: number;    
  proximosEventos: Evento[];   
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
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
  private readonly EVENT_INVITE_PREFIX = '__EVENT_INVITE__|';
  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef<HTMLDivElement>;

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

  constructor(private translate: TranslateService) {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (!u) return;

        const isOnline = (u as any).online ?? (u as any).isOnline ?? false;
        this.me.set({ ...(u as any), isOnline });

        const myId = this.getId(u);
        if (!myId) return;

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
            this.newFriendRequests.update(v => v + 1);
            if (this.showRequestsModal()) {
              this.refreshRequests();
            }
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.visibilitySub?.unsubscribe();
    this.focusSub?.unsubscribe();
    this.friendsPollSub?.unsubscribe();
    this.socketService.disconnect();
  }

  private cargarEstadisticasEventos(userId: string): void {
    this.loadingEvents.set(true);

    this.eventoService.getMisEventos().subscribe({
      next: (data) => {
        const creados = data.eventosCreados || [];
        const inscritos = data.eventosInscritos || [];

        const todosEventos = [...creados, ...inscritos];
        const ahora = new Date();
        
        const eventosFuturos = todosEventos
          .filter(e => {
            const fechaStr = Array.isArray(e.schedule) ? e.schedule[0] : e.schedule;
            if (!fechaStr) return false;
            return new Date(fechaStr) >= ahora;
          })
          .sort((a, b) => {
            const fechaA = Array.isArray(a.schedule) ? a.schedule[0] : a.schedule;
            const fechaB = Array.isArray(b.schedule) ? b.schedule[0] : b.schedule;
            return new Date(fechaA).getTime() - new Date(fechaB).getTime();
          })
          .slice(0, 3);

        this.eventStats.set({
          eventosCreados: creados.length,
          eventosInscritos: inscritos.length,
          proximosEventos: eventosFuturos
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

  goToExplorarEventos(): void {
    this.router.navigate(['/explorar-eventos']);
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
        const joined = participantes.includes(myId);
        this.eventInviteMembership[eventId] = joined;
      },
      error: (err) => {
        this.eventInviteMembership[eventId] = false;
      }
    });

    return false;
  }

  joinFromInvite(msg: ChatMessage): void {
    const data = this.getEventInviteData(msg);
    if (!data.id) return;

    this.eventoService.joinEvento(data.id).subscribe({
      next: () => {
        this.eventInviteMembership[data.id] = true;

        const meUser = this.me();
        if (meUser) {
          const myId = this.getId(meUser);
          if (myId) {
            this.cargarEstadisticasEventos(myId);
          }
        }
      },
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
}