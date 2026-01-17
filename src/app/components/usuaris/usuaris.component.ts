import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { MaskEmailPipe } from '../../pipes/maskEmail.pipe';
import { Evento } from '../../models/evento.model';
import { EventoService } from '../../services/evento.service';
import { Location } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-usuaris',
  templateUrl: './usuaris.component.html',
  styleUrls: ['./usuaris.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MaskEmailPipe]
})
export class UsuarisComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  usuarios: User[] = [];
  desplegado: boolean[] = [];
  mostrarPassword: boolean[] = [];

  nuevoUsuario: User = {
    username: '',
    gmail: '',
    password: '',
    birthday: new Date(),
    eventos: [], 
    isActive: true,
    rol: 'usuario'
  };

  birthdayStr: string = this.todayISO();
  confirmarPassword: string = '';
  usuarioEdicion: User | null = null;
  indiceEdicion: number | null = null;
  formSubmitted = false;
  usuarioAEliminar: User | null = null;
  errorMessage = '';
  emailExists: boolean = false;
  isCheckingEmail: boolean = false;
  isCheckingUsername = false;
  usernameExists = false;

  minDate: string = '1900-01-01';
  maxDate: string = '';

  showDeleteModal = false;
  private pendingDeleteIndex: number | null = null;

  showUpdateModal = false;
  private pendingUpdateUser: User | null = null;
  private pendingUpdateIndex: number | null = null;

  page = 1;
  pageSize = 6;
  totalUsuarios = 0;
  totalPagesBackend = 1;

  todosEventos: Evento[] = [];
  private eventosById = new Map<string, Evento>();

  constructor(
    private userService: UserService,
    private eventoService: EventoService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.calculateMaxDate();
    this.loadEventos();
    this.loadUsers();
  }

  private calculateMaxDate(): void {
    const today = new Date();
    const maxDateObj = new Date();
    maxDateObj.setFullYear(today.getFullYear() - 13);
    this.maxDate = maxDateObj.toISOString().split('T')[0];
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  loadUsers(): void {
    this.userService.getUsers(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.usuarios = (res.data ?? []).map(u => ({
          ...u,
          birthday: new Date(u.birthday as unknown as string)
        }));
        this.totalPagesBackend = res.totalPages ?? 1;
        this.totalUsuarios = res.totalItems ?? this.usuarios.length;
        this.desplegado = new Array(this.usuarios.length).fill(false);
        this.mostrarPassword = new Array(this.usuarios.length).fill(false);
      },
    });
  }

  cambiarRol(u: User): void {
    if (!u._id) return;
    const nuevoRol = u.rol === 'admin' ? 'usuario' : 'admin';

    this.userService.updateUserRole(u._id, nuevoRol).subscribe({
      next: (actualizado) => {
        u.rol = actualizado.rol;
        
        const idx = this.usuarios.findIndex(x => x._id === u._id);
        if (idx >= 0) this.usuarios[idx].rol = actualizado.rol;
      },
      error: () => alert('Error al cambiar el rol del usuario')
    });
  }

  prevBackendPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }

  nextBackendPage(): void {
    if (this.page < this.totalPagesBackend) {
      this.page++;
      this.loadUsers();
    }
  }

  setPageSize(v: string): void {
    const n = parseInt(v, 10) || 6;
    this.pageSize = n;
    this.page = 1;
    this.loadUsers();
  }

  private loadEventos(): void {
    this.eventoService.getEventos(1, 1000).subscribe({
      next: (res) => {
        this.todosEventos = (res.data ?? []).map((e: Evento) => ({
          ...e,
          schedule: Array.isArray(e.schedule)
            ? e.schedule
            : (e.schedule ? [e.schedule as any] : []),
          participantes: Array.isArray((e as any).participantes)
            ? (e as any).participantes
            : ((e as any).participants || [])
        }));

        this.eventosById.clear();
        this.todosEventos.forEach((ev: Evento) => {
          if (ev._id) this.eventosById.set(ev._id, ev);
        });
      },
      error: (err) => {
      }
    });
  }

  goHome(): void { 
    this.location.back(); 
  }

  agregarElemento(userForm: NgForm): void {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.emailExists = false;

    if (userForm.invalid) return;
    if (this.nuevoUsuario.password !== this.confirmarPassword) return;
    if (this.isFutureBirthday(this.birthdayStr)) return;

    this.isCheckingEmail = true;
    this.userService.checkEmailExists(this.nuevoUsuario.gmail, this.nuevoUsuario._id).subscribe({
      next: (res) => {
        this.isCheckingEmail = false;
        if (res.exists) {
          this.emailExists = true;
          return;
        }
        this.isCheckingUsername = true;
        this.userService.checkUsernameExists(this.nuevoUsuario.username, this.nuevoUsuario._id).subscribe({
          next: (res) => {
            this.isCheckingUsername = false;
            this.usernameExists = res.exists;
          },
          error: () => (this.isCheckingUsername = false)
        });

        const birthdayDate = this.parseAsUTCDate(this.birthdayStr);

        if (this.indiceEdicion !== null) {
          const actualizado: User = {
            ...this.nuevoUsuario,
            birthday: birthdayDate,
            _id: this.usuarios[this.indiceEdicion]._id,
            rol: this.nuevoUsuario.rol
          };
          this.pendingUpdateUser = actualizado;
          this.pendingUpdateIndex = this.indiceEdicion;
          this.showUpdateModal = true;
          return;
        }

        const usuarioJSON: User = {
          username: this.nuevoUsuario.username,
          gmail: this.nuevoUsuario.gmail,
          password: this.nuevoUsuario.password,
          birthday: birthdayDate,
          eventos: this.nuevoUsuario.eventos ?? [],
          rol: this.nuevoUsuario.rol
        };

        this.userService.addUser(usuarioJSON).subscribe(response => {
          this.loadUsers();
          this.desplegado = new Array(this.usuarios.length).fill(false);
          this.mostrarPassword = new Array(this.usuarios.length).fill(false);

          userForm.resetForm();
          this.resetFormInternal();
        });
      },
      error: () => {
        this.isCheckingEmail = false;
        alert('Error al verificar el correo.');
      }
    });
  }

  confirmarUpdate(): void {
    if (this.pendingUpdateUser == null || this.pendingUpdateIndex == null) {
      this.closeUpdateModal();
      return;
    }
    const idx = this.pendingUpdateIndex;
    this.userService.updateUser(this.pendingUpdateUser).subscribe(response => {
      this.loadUsers();
      this.closeUpdateModal();
      this.resetFormInternal();
    });
  }

  closeUpdateModal(): void {
    this.showUpdateModal = false;
    this.pendingUpdateUser = null;
    this.pendingUpdateIndex = null;
  }

  openDeleteModal(index: number): void {
    this.pendingDeleteIndex = index;
    this.usuarioAEliminar = this.usuarios[index];
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.pendingDeleteIndex = null;
    this.usuarioAEliminar = null;
    this.showDeleteModal = false;
  }

  confirmarDisable(): void {
    if (this.pendingDeleteIndex == null) {
      this.closeDeleteModal();
      return;
    }

    const idx = this.pendingDeleteIndex;
    const usuarioAEliminar = this.usuarios[idx];

    if (!usuarioAEliminar._id) {
      alert('El usuario no se puede modificar porque no está registrado en la base de datos.');
      this.closeDeleteModal();
      return;
    }
    
    this.userService.disableUser(usuarioAEliminar._id).subscribe(
      (updatedUser) => {
        if (this.usuarios.length === 1 && this.page > 1) {
          this.page--;
        }

        this.loadUsers();
        this.closeDeleteModal();
      },
      () => {
        alert('Error al actualizar el estado del usuario. Por favor, inténtalo de nuevo.');
        this.closeDeleteModal();
      }
    );
  }

  cancelarEdicion(userForm: NgForm): void {
    this.indiceEdicion = null;
    this.usuarioEdicion = null;
    userForm.resetForm();
    this.resetFormInternal();
  }

  private resetFormInternal(): void {
    this.nuevoUsuario = {
      username: '',
      gmail: '',
      password: '',
      birthday: new Date(),
      eventos: [],
      rol: 'usuario'
    };
    this.birthdayStr = this.todayISO();
    this.confirmarPassword = '';
    this.formSubmitted = false;
    this.indiceEdicion = null;
  }

  prepararEdicion(usuario: User, index: number): void {
    this.usuarioEdicion = { ...usuario };
    this.nuevoUsuario = { ...usuario };
    this.indiceEdicion = index;
    this.desplegado = this.desplegado.map((_, i) => i === index);

    if (usuario.birthday) {
      const d = new Date(usuario.birthday as string | Date);
      this.birthdayStr = this.toISODate(d);
    } else {
      this.birthdayStr = this.todayISO();
    }
  }

  toggleDesplegable(index: number): void {
    const globalIndex = index;
    const willOpen = !this.desplegado[globalIndex];
    this.desplegado = this.desplegado.map((_, i) => i === globalIndex ? willOpen : false);
  }

  togglePassword(index: number): void {
    this.mostrarPassword[index] = !this.mostrarPassword[index];
  }

  private userEventIds(u: User): string[] {
    return (u.eventos ?? []).map(e => typeof e === 'string' ? e : (e._id ?? '')).filter(Boolean) as string[];
  }

  getUserEvents(u: User): Evento[] {
    const ids = new Set(this.userEventIds(u));
    return this.todosEventos.filter(ev => ev._id && ids.has(ev._id));
  }

  getUserEventNames(u: User): string {
    const names = this.getUserEvents(u).map(e => e.name).filter(Boolean);
    return names.length ? names.join(', ') : '-';
  }

  getAvailableEvents(u: User): Evento[] {
    const ids = new Set(this.userEventIds(u));
    return this.todosEventos.filter(ev => ev._id && !ids.has(ev._id));
  }

  onAddEvent(u: User, ev: Evento): void {
    if (!u._id || !ev._id) return;
    this.userService.addEventToUser(u._id, ev._id).subscribe({
      next: (updated) => {
        this.loadUsers();
      },
      error: () => alert('No se pudo añadir el usuario a ese evento.')
    });
  }

  get pagedUsuarios(): User[] {
    return this.usuarios;
  }

  get totalPages(): number {
    return this.totalPagesBackend;
  }

  idx(i: number): number {
    return i;
  } 

  private todayISO(): string {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  private toISODate(d: Date): string {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  }

  private parseAsUTCDate(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  private todayUTC(): Date {
    const t = new Date();
    return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  isFutureBirthday(ymd: string): boolean {
    if (!ymd) return false;
    const selected = this.parseAsUTCDate(ymd);
    // Age check (13 years)
    const max = this.parseAsUTCDate(this.maxDate);
    const min = this.parseAsUTCDate(this.minDate);
    return selected > max || selected < min;
  }

  isEvento(e: string | Evento): e is Evento {
    return !!e && typeof e === 'object' && 'name' in e && 'schedule' in e;
  }
}