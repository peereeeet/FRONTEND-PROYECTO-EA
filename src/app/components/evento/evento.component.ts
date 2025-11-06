import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/evento.model';
import { EventoService } from '../../services/evento.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-evento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evento.component.html',
  styleUrls: ['./evento.component.css']
})
export class EventoComponent implements OnInit {
  eventos: Evento[] = [];
  totalEventos = 0; 
  totalPagesBackend = 1; 
  page = 1; 
  pageSize = 3; 
  users: User[] = [];
  availableUsers: User[] = [];
  selectedUsers: User[] = [];
  newEvent: Evento = { name: '', schedule: [], address: '', participantes: [] };
  dateStr: string = '';
  timeStr: string = '';
  errorMessage = '';
  showDeleteModal = false;
  private pendingDeleteIndex: number | null = null;

  formSubmitted = false;

  indiceEdicion: number | null = null;
  showUpdateModal = false;
  pendingUpdateEvento: Evento | null = null;

  showEditModal = false;
  editEvent: Evento = { name: '', schedule: [], address: '', participantes: [] };
  editAvailableUsers: User[] = [];
  editSelectedUsers: User[] = [];
  editDateStr: string = '';
  editTimeStr: string = '';
  private pendingEditIndex: number | null = null;

  availablePage = 1;
  availablePageSize = 3;
  selectedPage = 1;
  selectedPageSize = 3;

  editAvailablePage = 1;
  editAvailablePageSize = 3;
  editSelectedPage = 1;
  editSelectedPageSize = 3;

  constructor(
    private eventoService: EventoService,
    private userService: UserService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadEventos();
  }

  private loadEventos(): void {
    this.eventoService.getEventos(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.eventos = res.data.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) ? e.schedule : (e.schedule ? [e.schedule as any] : []),
          participantes: Array.isArray((e as any).participantes) ? (e as any).participantes : ((e as any).participants || [])
        }));
        this.totalEventos = res.totalItems ?? res.data.length;
        this.totalPagesBackend = res.totalPages ?? 1;
      },
      error: (err) => {
        console.error('Error al cargar eventos:', err);
      }
    });
  }

  nextBackendPage(): void {
    if (this.page < this.totalPagesBackend) {
      this.page++;
      this.loadEventos();
    }
  }
  prevBackendPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadEventos();
    }
  }

  private loadUsers(): void {
    this.userService.getUsers(1, 100).subscribe({
      next: (res) => {
        this.users = res.data;
        this.availableUsers = [...this.users];
      },
      error: (err) => {
        console.error('Error al cargar usuarios:', err);
      }
    });
  }

  prepararEdicion(evento: Evento, index: number): void {
    this.newEvent = { ...evento };
    this.indiceEdicion = index;

    if (this.newEvent.schedule && this.newEvent.schedule.length > 0) {
      const [fecha, hora] = this.newEvent.schedule[0].split(' ');
      this.dateStr = fecha;
      this.timeStr = hora;
    } else {
      this.dateStr = '';
      this.timeStr = '';
    }

    this.selectedUsers = this.users.filter(u =>
      this.newEvent.participantes?.includes(u._id!)
    );
    this.availableUsers = this.users.filter(u =>
      !this.newEvent.participantes?.includes(u._id!)
    );

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.indiceEdicion = null;
    this.newEvent = { name: '', schedule: [], address: '', participantes: [] };
    this.selectedUsers = [];
    this.availableUsers = [...this.users];
    this.dateStr = '';
    this.timeStr = '';
    this.formSubmitted = false;
  }

  // Open edit modal with event data
  openEditModal(index: number): void {
  this.pendingEditIndex = index;
  const evento = this.eventos[index];

  this.eventoService.getEventoById(evento._id!).subscribe({
    next: (ev: any) => {
      this.editEvent = {
        ...ev,
        schedule: Array.isArray(ev.schedule)
          ? ev.schedule
          : ev.schedule
          ? [ev.schedule]
          : [],
        participantes: ev.participantes?.map((p: any) =>
          typeof p === 'string' ? p : p._id
        ) || []
      };

      this.editSelectedUsers = this.users.filter(u =>
        this.editEvent.participantes?.includes(u._id!)
      );
      this.editAvailableUsers = this.users.filter(u =>
        !this.editEvent.participantes?.includes(u._id!)
      );

      if (this.editEvent.schedule.length > 0) {
        const [date, time] = this.editEvent.schedule[0].split(' ');
        this.editDateStr = date;
        this.editTimeStr = time;
      } else {
        this.editDateStr = '';
        this.editTimeStr = '';
      }

      this.showEditModal = true;
      this.clampEditPages();
    },
    error: (err) => {
      console.error('Error al cargar evento para edición:', err);
      this.errorMessage = 'No se pudo cargar el evento seleccionado.';
    }
  });
}

  closeEditModal(): void {
    this.showEditModal = false;
    this.pendingEditIndex = null;
    this.editEvent = { name: '', schedule: [], address: '', participantes: [] };
    this.editAvailableUsers = [];
    this.editSelectedUsers = [];
    this.editDateStr = '';
    this.editTimeStr = '';
  }

  setEditSchedule(): void {
    this.errorMessage = '';
    if (!this.editDateStr || !this.editTimeStr) {
      this.errorMessage = 'Selecciona fecha y hora.';
      return;
    }
    const slot = `${this.editDateStr} ${this.editTimeStr}`;
    this.editEvent.schedule = [slot];
  }

  clearEditSchedule(): void {
    this.editEvent.schedule = [];
    this.editDateStr = '';
    this.editTimeStr = '';
  }

  // Add participant in edit mode
  addEditParticipant(u: User): void {
    if (!u?._id) return;
    this.editAvailableUsers = this.editAvailableUsers.filter(x => x._id !== u._id);
    if (!this.editSelectedUsers.find(x => x._id === u._id)) this.editSelectedUsers.push(u);
    this.syncEditParticipantsIds();
    this.clampEditPages();
  }

  // Remove participant in edit mode
  removeEditParticipant(u: User): void {
    if (!u?._id) return;
    this.editSelectedUsers = this.editSelectedUsers.filter(x => x._id !== u._id);
    if (!this.editAvailableUsers.find(x => x._id === u._id)) {
      this.editAvailableUsers.push(u);
      this.editAvailableUsers.sort((a, b) => a.username.localeCompare(b.username));
    }
    this.syncEditParticipantsIds();
    this.clampEditPages();
  }

  private syncEditParticipantsIds(): void {
    this.editEvent.participantes = this.editSelectedUsers.map(u => u._id!).filter(Boolean);
  }

  // Submit edited event data
  onEditSubmit(): void {
    this.errorMessage = '';
    if (!this.editEvent.name?.trim()) {
      this.errorMessage = 'El título del evento es obligatorio.';
      return;
    }
    if (!this.editEvent.schedule?.length) {
      this.errorMessage = 'Selecciona el horario del evento.';
      return;
    }
    if (!this.editEvent.address?.length) {
      this.errorMessage = 'Selecciona la dirección del evento.';
      return;
    }

    this.eventoService.updateEvento(this.editEvent).subscribe({
      next: (updated) => {
        const normalized: Evento = {
          ...updated,
          schedule: Array.isArray(updated.schedule) ? updated.schedule : (updated.schedule ? [updated.schedule as any] : []),
          participantes: Array.isArray((updated as any).participantes) ? (updated as any).participantes : ((updated as any).participants || [])
        };
        
        if (this.pendingEditIndex !== null) {
          this.eventos[this.pendingEditIndex] = normalized;
        }
        
        this.closeEditModal();
        this.errorMessage = '';
      },
      error: () => this.errorMessage = 'Error al actualizar el evento. Revisa los datos.'
    });
  }

  // Pagination methods for edit mode
  get editAvailableTotalPages(): number {
    return Math.max(1, Math.ceil(this.editAvailableUsers.length / this.editAvailablePageSize));
  }

  get editSelectedTotalPages(): number {
    return Math.max(1, Math.ceil(this.editSelectedUsers.length / this.editSelectedPageSize));
  }

  get editAvailablePageItems(): User[] {
    const start = (this.editAvailablePage - 1) * this.editAvailablePageSize;
    return this.editAvailableUsers.slice(start, start + this.editAvailablePageSize);
  }

  get editSelectedPageItems(): User[] {
    const start = (this.editSelectedPage - 1) * this.editSelectedPageSize;
    return this.editSelectedUsers.slice(start, start + this.editSelectedPageSize);
  }

  editAvailablePrevPage(): void {
    if (this.editAvailablePage > 1) this.editAvailablePage--;
  }

  editAvailableNextPage(): void {
    if (this.editAvailablePage < this.editAvailableTotalPages) this.editAvailablePage++;
  }

  setEditAvailablePageSize(v: string): void {
    const n = parseInt(v, 10) || 5;
    this.editAvailablePageSize = n;
    this.editAvailablePage = 1;
    this.clampEditPages();
  }

  editSelectedPrevPage(): void {
    if (this.editSelectedPage > 1) this.editSelectedPage--;
  }

  editSelectedNextPage(): void {
    if (this.editSelectedPage < this.editSelectedTotalPages) this.editSelectedPage++;
  }

  setEditSelectedPageSize(v: string): void {
    const n = parseInt(v, 10) || 5;
    this.editSelectedPageSize = n;
    this.editSelectedPage = 1;
    this.clampEditPages();
  }

  private clampEditPages(): void {
    this.editAvailablePage = Math.min(Math.max(1, this.editAvailablePage), this.editAvailableTotalPages);
    this.selectedPage = Math.min(Math.max(1, this.selectedPage), this.selectedTotalPages);
  }

  goHome(): void {
    this.location.back();
  }

  setSchedule(): void {
    this.errorMessage = '';
    if (!this.dateStr || !this.timeStr) {
      this.errorMessage = 'Selecciona fecha y hora.';
      return;
    }
    const slot = `${this.dateStr} ${this.timeStr}`;
    this.newEvent.schedule = [slot];
  }

  clearSchedule(): void {
    this.newEvent.schedule = [];
    this.dateStr = '';
    this.timeStr = '';
  }

  addParticipant(u: User): void {
    if (!u?._id) return;
    this.availableUsers = this.availableUsers.filter(x => x._id !== u._id);
    if (!this.selectedUsers.find(x => x._id === u._id)) this.selectedUsers.push(u);
    this.syncParticipantsIds();
    this.clampPages();
  }

  removeParticipant(u: User): void {
    if (!u?._id) return;
    this.selectedUsers = this.selectedUsers.filter(x => x._id !== u._id);
    if (!this.availableUsers.find(x => x._id === u._id)) {
      this.availableUsers.push(u);
      this.availableUsers.sort((a, b) => a.username.localeCompare(b.username));
    }
    this.syncParticipantsIds();
    this.clampPages();
  }

  private syncParticipantsIds(): void {
    this.newEvent.participantes = this.selectedUsers.map(u => u._id!).filter(Boolean);
  }

  onSubmit(): void {
  this.errorMessage = '';

  if (!this.newEvent.name?.trim()) {
    this.errorMessage = 'El título del evento es obligatorio.';
    return;
  }
  if (!this.newEvent.schedule?.length) {
    this.errorMessage = 'Selecciona el horario del evento.';
    return;
  }
  if (!this.newEvent.address?.length) {
    this.errorMessage = 'Selecciona la dirección del evento.';
    return;
  }

  this.eventoService.checkEventNameExists(this.newEvent.name).subscribe({
    next: (res) => {
      if (res.exists) {
        this.errorMessage = '⚠️ Ya existe un evento con este título.';
        return;
      }

      // Crear el evento si no existe duplicado
      this.eventoService.addEvento(this.newEvent).subscribe({
        next: (created) => {
          const normalized: Evento = {
            ...created,
            schedule: Array.isArray(created.schedule)
              ? created.schedule
              : (created.schedule ? [created.schedule as any] : []),
            participantes: Array.isArray((created as any).participantes)
              ? (created as any).participantes
              : ((created as any).participants || [])
          };
          this.eventos.push(normalized);
          this.resetForm();
        },
        error: () => (this.errorMessage = 'Error al crear el evento. Revisa los datos.')
      });
    },
    error: () => (this.errorMessage = 'Error al verificar el título del evento.')
  });
}

  openDeleteModal(index: number): void {
    this.pendingDeleteIndex = index;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.pendingDeleteIndex = null;
  }

  confirmarEliminar(): void {
    if (this.pendingDeleteIndex == null) {
      this.closeDeleteModal();
      return;
    }
    const idx = this.pendingDeleteIndex;
    const evt = this.eventos[idx];
    if (!evt?._id) {
      this.closeDeleteModal();
      return;
    }
    this.eventoService.deleteEvento(evt._id).subscribe({
      next: () => {
        this.eventos.splice(idx, 1);
        this.closeDeleteModal();
      },
      error: () => {
        this.errorMessage = 'Error al eliminar el evento.';
        this.closeDeleteModal();
      }
    });
  }

  getScheduleText(e: Evento): string {
    if (Array.isArray(e.schedule) && e.schedule.length) return this.formatSchedule(e.schedule[0]);
    if (typeof (e as any).schedule === 'string') return this.formatSchedule((e as any).schedule);
    return '-';
  }

  formatSchedule(s: string | undefined | null): string {
    if (!s) return '-';
    const sep = s.includes('T') ? 'T' : ' ';
    const [d, t = ''] = s.split(sep);
    const [y, m, d2] = d.split('-');
    const hhmm = t.slice(0,5);
    if (y && m && d2) return `${d2}-${m}-${y}${hhmm ? ' ' + hhmm : ''}`;
    return s;
  }

  getEventAddress(e: any): string {
    return e?.address ?? e?.direccion ?? '-';
  }

  getParticipantsList(e: any): string[] {
    return e?.participantes ?? e?.participants ?? [];
  }

  getParticipantsNames(e: any): string {
    const ids = this.getParticipantsList(e);
    const names = ids.map(p => this.getUserNameById(p)).filter(Boolean);
    return names.length ? names.join(', ') : '-';
  }

  getUserNameById(idOrObj: any): string {
    if (idOrObj && typeof idOrObj === 'object') {
      if (idOrObj.username) return idOrObj.username;
      if (idOrObj._id) {
        const u = this.users.find(x => x._id === idOrObj._id);
        return u ? u.username : idOrObj._id;
      }
    }
    const u = this.users.find(x => x._id === idOrObj);
    return u ? u.username : (idOrObj || '');
  }

  get availableTotalPages(): number {
    return Math.max(1, Math.ceil(this.availableUsers.length / this.availablePageSize));
  }
  get selectedTotalPages(): number {
    return Math.max(1, Math.ceil(this.selectedUsers.length / this.selectedPageSize));
  }

  get availablePageItems(): User[] {
    const start = (this.availablePage - 1) * this.availablePageSize;
    return this.availableUsers.slice(start, start + this.availablePageSize);
  }
  get selectedPageItems(): User[] {
    const start = (this.selectedPage - 1) * this.selectedPageSize;
    return this.selectedUsers.slice(start, start + this.selectedPageSize);
  }

  availablePrevPage(): void {
    if (this.availablePage > 1) this.availablePage--;
  }
  availableNextPage(): void {
    if (this.availablePage < this.availableTotalPages) this.availablePage++;
  }
  setAvailablePageSize(v: string): void {
    const n = parseInt(v, 10) || 5;
    this.availablePageSize = n;
    this.availablePage = 1;
    this.clampPages();
  }

  selectedPrevPage(): void {
    if (this.selectedPage > 1) this.selectedPage--;
  }
  selectedNextPage(): void {
    if (this.selectedPage < this.selectedTotalPages) this.selectedPage++;
  }
  setSelectedPageSize(v: string): void {
    const n = parseInt(v, 10) || 5;
    this.selectedPageSize = n;
    this.selectedPage = 1;
    this.clampPages();
  }

  private clampPages(): void {
    this.availablePage = Math.min(Math.max(1, this.availablePage), this.availableTotalPages);
    this.selectedPage = Math.min(Math.max(1, this.selectedPage), this.selectedTotalPages);
  }

  private resetForm(): void {
    this.newEvent = { name: '', schedule: [], address: '', participantes: [] };
    this.availableUsers = [...this.users];
    this.selectedUsers = [];
    this.dateStr = '';
    this.timeStr = '';
    this.errorMessage = '';
    this.availablePage = 1;
    this.selectedPage = 1;
    this.clampPages();
  }
}