import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../models/user.model';
import { compileOpaqueAsyncClassMetadata } from '@angular/compiler';

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

  // ======= MODAL "Explorar usuarios" =======
  showAddModal = signal(false);
  modalError = signal('');
  modalSearch = signal('');
  allUsers = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  mPage = signal(1);
  mPageSize = signal(10);

    // ======= MODAL "Solicitudes de amistad" =======
  showRequestsModal = signal(false);
  requestsLoading = signal(false);
  requestsError = signal('');
  requestsList = signal<User[]>([]);

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

        // Heartbeat inicial
        this.userService.heartbeat(myId).subscribe({
          next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
          error: () => {}
        });

        // Heartbeat periódico
        interval(60000)
          .pipe(takeUntil(this.destroy$), switchMap(() => this.userService.heartbeat(myId)))
          .subscribe({
            next: hb => this.me.set({ ...(this.me() as User), isOnline: !!hb.online }),
            error: () => {}
          });

        // Cargar amigos
        this.cargarAmigos(myId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          const arr = (page?.data ?? []).map(this.mapOnline);
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

  // ====== Cerrar sesión (igual que en Home) ======
  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['login']);
  }

  // ====== Acciones amigos ======
  quitar(friendId: string): void {
    const meUser = this.me(); if (!meUser) return;
    const myId = this.getId(meUser); if (!myId) return;

    this.userService.removeFriend(myId, friendId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cargarAmigos(myId),
        error: () => {}
      });
  }

  // ====== Modal ======
  openAddFriendsModal(): void {
    this.modalError.set('');
    this.modalSearch.set('');
    this.mPage.set(1);
    this.showAddModal.set(true);
    this.loadModalUsers();
  }

  closeAddFriendsModal(): void {
    this.showAddModal.set(false);
    // recargar amigos por si hubo cambios
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

  /** ← para el botón Buscar del modal */
  buscarPersonas(): void {
    // Si quieres volver a consultar al backend con el término, haz getUsers(page, limit, modalSearch()).
    // Como ya filtramos en onInput, aquí basta con re-aplicar filtro por si cambia el tamaño de página.
    this.applyModalFilter();
    this.mPage.set(1);
  }

  private loadModalUsers(): void {
    // Trae usuarios para explorar (ajusta el límite si quieres)
    this.userService.getUsers(1, 200, '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: page => {
          const arr = (page?.data ?? []).map(u => ({
            ...u,
            isOnline: (u as any).online ?? (u as any).isOnline ?? false
          }));
          this.allUsers.set(arr);
          this.applyModalFilter();
        },
        error: err => {
          this.modalError.set(err?.error?.message || 'No se pudo cargar la lista de usuarios');
          this.allUsers.set([]);
          this.filteredUsers.set([]);
        }
      });
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
  if (!userId) return; // Evita undefined

  const meUser = this.me();
  if (!meUser) return;
  const myId = this.getId(meUser);
  if (!myId) return;

  this.userService
    .sendFriendRequest(myId, userId)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Quita al usuario del modal tras enviar la solicitud
        this.filteredUsers.set(
          this.filteredUsers().filter((u) => this.getId(u) !== userId)
        );
        this.allUsers.set(
          this.allUsers().filter((u) => this.getId(u) !== userId)
        );
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
  // paginación modal
  modalPrev(): void { if (this.mPage() > 1) this.mPage.set(this.mPage() - 1); }
  modalNext(): void { if (this.mPage() < this.mTotalPages) this.mPage.set(this.mPage() + 1); }
}
