import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { MaskEmailPipe } from '../../pipes/maskEmail.pipe';
import { Evento } from '../../models/evento.model';
import { EventoService } from '../../services/evento.service';
import { Location } from '@angular/common';
import { DynamicTableComponent, TableColumn } from '../table/table.component';

@Component({
  selector: 'app-usuaris',
  templateUrl: './usuaris.component.html',
  styleUrls: ['./usuaris.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MaskEmailPipe, DynamicTableComponent]
})
export class UsuarisComponent implements OnInit {
  usuarios: User[] = [];
  desplegado: boolean[] = [];
  mostrarPassword: boolean[] = [];

  /*showTableView: boolean = false;
  tableColumns: TableColumn[] = [
    { key: 'username', label: 'Nombre de Usuario', sortable: true },
    { key: 'gmail', label: 'Email', sortable: true },
    { key: 'birthday', label: 'Cumpleaños', sortable: true, type: 'date' },
    { key: 'eventCount', label: 'Nº Eventos', sortable: true },
    { key: 'actions', label: 'Acciones', type: 'actions' }
  ];*/

  nuevoUsuario: User = {
    username: '',
    gmail: '',
    password: '',
    birthday: new Date(),
    eventos: [], 
    isActive: true,
    role: 'usuario'
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
    this.loadEventos();
    this.loadUsers();
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
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
      }
    });
  }

  cambiarRol(u: User): void {
  if (!u._id) return;
  const nuevoRol = u.role === 'admin' ? 'usuario' : 'admin';

  this.userService.updateUserRole(u._id, nuevoRol).subscribe({
    next: (actualizado) => {
      u.role = actualizado.role;
      
      const idx = this.usuarios.findIndex(x => x._id === u._id);
      if (idx >= 0) this.usuarios[idx].role = actualizado.role;
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
      console.error('Error al cargar eventos:', err);
    }
  });
}

  /*toggleTableView(): void {
    this.showTableView = !this.showTableView;
  }

  get usuariosForTable(): any[] { 
  return (this.usuarios ?? []).map(usuario => ({
    ...usuario,
    eventCount: this.getUserEvents(usuario).length,
    birthday: new Date(usuario.birthday)
  }));
}

  onTableEdit(user: any): void {
    const index = this.usuarios.findIndex(u => u._id === user._id);
    if (index !== -1) {
      this.prepararEdicion(this.usuarios[index], index);
      document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onTableDelete(user: any): void {
    const index = this.usuarios.findIndex(u => u._id === user._id);
    if (index !== -1) {
      this.openDeleteModal(index);
    }
  }

  exportTable(): void {
    const csvContent = this.convertToCSV(this.usuariosForTable);
    this.downloadCSV(csvContent, 'usuarios.csv');
  }

  onTableToggleActive(user: any): void {
    const index = this.usuarios.findIndex(u => u._id === user._id);
    if (index === -1) return;

    const usuarioActualizado = { ...this.usuarios[index], isActive: !this.usuarios[index].isActive };

    this.userService.updateUser(usuarioActualizado).subscribe({
      next: (res) => {
        this.usuarios[index] = res;
      },
      error: (err) => {
        console.error('Error al cambiar estado del usuario:', err);
        alert('No se pudo cambiar el estado del usuario.');
      }
    });
  }

  private convertToCSV(data: any[]): string {
    const headers = ['Nombre de Usuario', 'Email', 'Cumpleaños', 'Nº Eventos'];
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = [
        `"${row.username}"`,
        `"${row.gmail}"`,
        `"${new Date(row.birthday).toLocaleDateString()}"`,
        row.eventCount
      ];
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }*/

  goHome(): void { this.location.back(); }

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
          role: this.nuevoUsuario.role
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
        role: this.nuevoUsuario.role
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
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.pendingDeleteIndex = null;
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
      role: 'usuario'
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
    this.birthdayStr = this.toISODate(new Date(usuario.birthday));
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
    return this.parseAsUTCDate(ymd) > this.todayUTC();
  }

  isEvento(e: string | Evento): e is Evento {
    return !!e && typeof e === 'object' && 'name' in e && 'schedule' in e;
  }
}
