import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, Subscription, fromEvent } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { compileOpaqueAsyncClassMetadata } from '@angular/compiler';
import { HostListener } from '@angular/core';

type FriendLike = User;

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
  private router = inject(Router);

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
  mPageSize = signal(10);

  showRequestsModal = signal(false);
  requestsLoading = signal(false);
  requestsError = signal('');
  requestsList = signal<User[]>([]);
  sentRequests = signal<any[]>([]);

  private visibilitySub?: Subscription;
  private focusSub?: Subscription;
  private friendsPollSub?: Subscription;

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

  private getId(u: User): string {
    return String((u as any)?._id ?? (u as any)?.id ?? '');
  }

  meStatusText = computed(() => {
    const m = this.me();
    if (!m) return 'Desconectado';
    return (m as any).isOnline ? 'En línea' : 'Desconectado';
  });

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        if (!u) return;

        const isOnline = (u as any).online ?? (u as any).isOnline ?? false;
        this.me.set({ ...(u as any), isOnline });

        const myId = this.getId(u);
        if (!myId) return;

        this.userService.heartbeat(myId).subscribe({
          next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
          error: () => {}
        });

        interval(30000)
          .pipe(takeUntil(this.destroy$), switchMap(() => this.userService.heartbeat(myId)))
          .subscribe({
            next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
            error: () => {}
          });

        this.cargarAmigos(myId);
        this.visibilitySub = fromEvent(document, 'visibilitychange')
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            if (document.visibilityState === 'visible') this.cargarAmigos(myId);
          });

        this.focusSub = fromEvent(window, 'focus')
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.cargarAmigos(myId));

        this.friendsPollSub = interval(60000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.cargarAmigos(myId));
      });

    this.userService.onFriendsChanged()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const m = this.me(); if (!m) return;
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

  private mapOnline = (u: any): FriendLike => ({
    ...u,
    isOnline: u.online ?? u.isOnline ?? false
  });

  cargarAmigos(userId: string): void {
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

  goToPerfil(): void {
    const user = this.me?.();
    if (!user || !user._id) return;

    this.router.navigate(['/perfil'], {
      state: { userId: String(user._id) } // ← pasamos SOLO el id
    });
  }

  quitar(friendId: string): void {
    const meUser = this.me(); if (!meUser) return;
    const myId = this.getId(meUser); if (!myId) return;

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

  closeAddFriendsModal(): void {
    this.showAddModal.set(false);
    const meUser = this.me(); if (!meUser) return;
    const myId = this.getId(meUser); if (!myId) return;
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
            this.requestsList().filter(
              (u) => this.getId(u) !== userId
            )
          );
          this.cargarAmigos(myId);
        },
        error: () =>
          this.requestsError.set('Error al aceptar la solicitud'),
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
            this.requestsList().filter(
              (u) => this.getId(u) !== userId
            )
          );
        },
        error: () =>
          this.requestsError.set('Error al rechazar la solicitud'),
      });
    
}

  modalPrev(): void { if (this.mPage() > 1) this.mPage.set(this.mPage() - 1); }
  modalNext(): void { if (this.mPage() < this.mTotalPages) this.mPage.set(this.mPage() + 1); }
}
