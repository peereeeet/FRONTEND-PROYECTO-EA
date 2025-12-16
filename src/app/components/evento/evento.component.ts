import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Evento } from '../../models/evento.model';
import { EventoService } from '../../services/evento.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { ValoracionService } from '../../services/valoracion.service';
import { Valoracion } from '../../models/valoracion.model';

@Component({
  selector: 'app-evento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evento.component.html',
  styleUrls: ['./evento.component.css']
})
export class EventoComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  eventos: Evento[] = [];
  totalEventos = 0; 
  totalPagesBackend = 1; 
  page = 1; 
  pageSize = 3; 
  users: User[] = [];
  availableUsers: User[] = [];
  selectedUsers: User[] = [];
  newEvent: Evento = { name: '', schedule: [], address: '', participantes: [] };
  creatorId: string = '';
  editCreatorId: string = '';
  saving = false;
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
  availablePageSize = 5;
  selectedPage = 1;
  selectedPageSize = 5;
  
  editAvailablePage = 1;
  editAvailablePageSize = 5;
  editSelectedPage = 1;
  editSelectedPageSize = 5;

  // Modal de valoraciones
  showRatingsModal = false;
  ratingsEventoId: string | null = null;
  ratingsEventoName = '';
  ratingsAvg?: number;
  ratingsCount?: number;
  
  ratingsList: Valoracion[] = [];
  ratingsLoading = false;
  ratingsError = '';
  
  ratingsPage: number = 1;
  ratingsPageSize: number = 5;
  ratingsTotalItems: number = 0;
  ratingsTotalPages: number = 1;
  Math = Math;
  stars = [1, 2, 3, 4, 5];

  constructor(
    private eventoService: EventoService,
    private userService: UserService,
    private location: Location,
    private router: Router,
    private valoracionService: ValoracionService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadEvents();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  loadUsers(): void {
    this.userService.getUsers(1, 1000).subscribe({
      next: (res) => {
        this.users = res.data ?? [];
        this.updateAvailableLists();
      },
      error: (err) => console.error('Error cargando usuarios', err)
    });
  }

  loadEvents(): void {
    this.eventoService.getEventos(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.eventos = (res.data ?? []).map((e: Evento) => {
          const scheduleArray = Array.isArray(e.schedule)
            ? e.schedule
            : (e.schedule ? [e.schedule as any] : []);

          const participantesArray = Array.isArray((e as any).participantes)
            ? (e as any).participantes
            : ((e as any).participants || []);

          return {
            ...e,
            schedule: scheduleArray,
            participantes: participantesArray
          };
        });

        this.totalPagesBackend = res.totalPages ?? 1;
        this.totalEventos = res.totalItems ?? this.eventos.length;
      },
      error: (err) => console.error('Error cargando eventos', err)
    });
  }

  updateAvailableLists(): void {
    const selectedIds = new Set(this.selectedUsers.map(u => u._id));
    this.availableUsers = this.users.filter(u => u._id && !selectedIds.has(u._id));
  }

  addParticipant(user: User): void {
    if (!this.selectedUsers.find(u => u._id === user._id)) {
      this.selectedUsers.push(user);
      this.updateAvailableLists();
      this.availablePage = 1;
      this.selectedPage = 1;
    }
  }

  removeParticipant(user: User): void {
    this.selectedUsers = this.selectedUsers.filter(u => u._id !== user._id);
    this.updateAvailableLists();
    this.availablePage = 1;
    this.selectedPage = 1;
  }

  get availableTotalPages(): number {
    return Math.ceil(this.availableUsers.length / this.availablePageSize) || 1;
  }

  get availablePageItems(): User[] {
    const start = (this.availablePage - 1) * this.availablePageSize;
    return this.availableUsers.slice(start, start + this.availablePageSize);
  }

  availablePrevPage(): void {
    if (this.availablePage > 1) this.availablePage--;
  }

  availableNextPage(): void {
    if (this.availablePage < this.availableTotalPages) this.availablePage++;
  }

  get selectedTotalPages(): number {
    return Math.ceil(this.selectedUsers.length / this.selectedPageSize) || 1;
  }

  get selectedPageItems(): User[] {
    const start = (this.selectedPage - 1) * this.selectedPageSize;
    return this.selectedUsers.slice(start, start + this.selectedPageSize);
  }

  selectedPrevPage(): void {
    if (this.selectedPage > 1) this.selectedPage--;
  }

  selectedNextPage(): void {
    if (this.selectedPage < this.selectedTotalPages) this.selectedPage++;
  }

  setSchedule(): void {
    if (this.dateStr && this.timeStr) {
      const combined = `${this.dateStr}T${this.timeStr}:00.000Z`;
      this.newEvent.schedule = [combined];
    }
  }

  clearSchedule(): void {
    this.newEvent.schedule = [];
    this.dateStr = '';
    this.timeStr = '';
  }

  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';

    if (!this.newEvent.name || this.newEvent.name.trim().length < 3) {
      this.errorMessage = 'El título del evento debe tener al menos 3 caracteres.';
      return;
    }

    if (!this.creatorId) {
      this.errorMessage = 'Debes seleccionar un creador del evento.';
      return;
    }

    this.saving = true;

    const participantIds = this.selectedUsers
      .map(u => u._id)
      .filter((id): id is string => !!id);

    const eventoJSON: Evento = {
      name: this.newEvent.name,
      schedule: this.newEvent.schedule ?? [],
      address: this.newEvent.address || '',
      participantes: participantIds,
      creador: this.creatorId
    };

    this.eventoService.addEvento(eventoJSON).subscribe({
      next: () => {
        this.newEvent = { name: '', schedule: [], address: '', participantes: [] };
        this.selectedUsers = [];
        this.creatorId = '';
        this.dateStr = '';
        this.timeStr = '';
        this.formSubmitted = false;
        this.saving = false;
        this.updateAvailableLists();
        this.loadEvents();
      },
      error: (err) => {
        console.error('Error guardando evento', err);
        this.errorMessage = 'Error al guardar el evento. Inténtalo de nuevo.';
        this.saving = false;
      }
    });
  }

  openDeleteModal(index: number): void {
    this.pendingDeleteIndex = index;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.pendingDeleteIndex = null;
    this.showDeleteModal = false;
  }

  confirmarEliminar(): void {
    if (this.pendingDeleteIndex === null) return;

    const evento = this.eventos[this.pendingDeleteIndex];
    if (!evento._id) return;

    this.eventoService.deleteEvento(evento._id).subscribe({
      next: () => {
        this.loadEvents();
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error('Error eliminando evento', err);
        alert('Error al eliminar el evento');
        this.closeDeleteModal();
      }
    });
  }

  openEditModal(index: number): void {
    const evento = this.eventos[index];
    this.editEvent = JSON.parse(JSON.stringify(evento));
    this.pendingEditIndex = index;

    this.editCreatorId = (evento.creador as any)?._id || evento.creador || '';

    const scheduleArray = Array.isArray(this.editEvent.schedule)
      ? this.editEvent.schedule
      : (this.editEvent.schedule ? [this.editEvent.schedule as any] : []);

    if (scheduleArray.length > 0) {
      const firstSchedule = scheduleArray[0];
      const d = new Date(firstSchedule);
      if (!isNaN(d.getTime())) {
        this.editDateStr = d.toISOString().slice(0, 10);
        this.editTimeStr = d.toISOString().slice(11, 16);
      }
    } else {
      this.editDateStr = '';
      this.editTimeStr = '';
    }

    const participantIds = (this.editEvent.participantes ?? [])
      .map(p => (typeof p === 'string' ? p : (p as any)._id))
      .filter(Boolean);

    this.editSelectedUsers = this.users.filter(u => u._id && participantIds.includes(u._id));
    this.updateEditAvailableLists();

    this.editAvailablePage = 1;
    this.editSelectedPage = 1;
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.pendingEditIndex = null;
    this.editEvent = { name: '', schedule: [], address: '', participantes: [] };
    this.editSelectedUsers = [];
    this.editAvailableUsers = [];
    this.editDateStr = '';
    this.editTimeStr = '';
  }

  updateEditAvailableLists(): void {
    const selectedIds = new Set(this.editSelectedUsers.map(u => u._id));
    this.editAvailableUsers = this.users.filter(u => u._id && !selectedIds.has(u._id));
  }

  addEditParticipant(user: User): void {
    if (!this.editSelectedUsers.find(u => u._id === user._id)) {
      this.editSelectedUsers.push(user);
      this.updateEditAvailableLists();
      this.editAvailablePage = 1;
      this.editSelectedPage = 1;
    }
  }

  removeEditParticipant(user: User): void {
    this.editSelectedUsers = this.editSelectedUsers.filter(u => u._id !== user._id);
    this.updateEditAvailableLists();
    this.editAvailablePage = 1;
    this.editSelectedPage = 1;
  }

  get editAvailableTotalPages(): number {
    return Math.ceil(this.editAvailableUsers.length / this.editAvailablePageSize) || 1;
  }

  get editAvailablePageItems(): User[] {
    const start = (this.editAvailablePage - 1) * this.editAvailablePageSize;
    return this.editAvailableUsers.slice(start, start + this.editAvailablePageSize);
  }

  editAvailablePrevPage(): void {
    if (this.editAvailablePage > 1) this.editAvailablePage--;
  }

  editAvailableNextPage(): void {
    if (this.editAvailablePage < this.editAvailableTotalPages) this.editAvailablePage++;
  }

  get editSelectedTotalPages(): number {
    return Math.ceil(this.editSelectedUsers.length / this.editSelectedPageSize) || 1;
  }

  get editSelectedPageItems(): User[] {
    const start = (this.editSelectedPage - 1) * this.editSelectedPageSize;
    return this.editSelectedUsers.slice(start, start + this.editSelectedPageSize);
  }

  editSelectedPrevPage(): void {
    if (this.editSelectedPage > 1) this.editSelectedPage--;
  }

  editSelectedNextPage(): void {
    if (this.editSelectedPage < this.editSelectedTotalPages) this.editSelectedPage++;
  }

  setEditSchedule(): void {
    if (this.editDateStr && this.editTimeStr) {
      const combined = `${this.editDateStr}T${this.editTimeStr}:00.000Z`;
      this.editEvent.schedule = [combined];
    }
  }

  clearEditSchedule(): void {
    this.editEvent.schedule = [];
    this.editDateStr = '';
    this.editTimeStr = '';
  }

  onEditSubmit(): void {
    if (!this.editEvent.name || this.editEvent.name.trim().length < 3) {
      alert('El título del evento debe tener al menos 3 caracteres.');
      return;
    }

    if (!this.editCreatorId) {
      alert('Debes seleccionar un creador del evento.');
      return;
    }

    const participantIds = this.editSelectedUsers
      .map(u => u._id)
      .filter((id): id is string => !!id);

    const eventoActualizado: Evento = {
      ...this.editEvent,
      participantes: participantIds,
      creador: this.editCreatorId
    };

    if (!eventoActualizado._id) {
      alert('Error: no se puede actualizar un evento sin ID');
      return;
    }

    this.eventoService.updateEvento(eventoActualizado).subscribe({
      next: () => {
        this.loadEvents();
        this.closeEditModal();
      },
      error: (err) => {
        console.error('Error actualizando evento', err);
        alert('Error al actualizar el evento');
      }
    });
  }

  getScheduleText(evento: Evento): string {
    const scheduleArray = Array.isArray(evento.schedule)
      ? evento.schedule
      : (evento.schedule ? [evento.schedule as any] : []);

    if (scheduleArray.length === 0) return 'Sin horario definido';

    const firstSchedule = scheduleArray[0];
    const d = new Date(firstSchedule);

    if (isNaN(d.getTime())) return 'Sin horario definido';

    const datePart = d.toLocaleDateString('es-ES');
    const timePart = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return `${datePart} a las ${timePart}`;
  }

  getEventAddress(evento: Evento): string {
    return evento.address || 'Sin dirección especificada';
  }

  getParticipantsNames(evento: Evento): string {
    const participants = evento.participantes ?? [];

    if (participants.length === 0) return 'Ningún participante';

    const names = participants
      .map(p => {
        if (typeof p === 'string') {
          const user = this.users.find(u => u._id === p);
          return user?.username || 'Usuario desconocido';
        }
        return (p as any).username || 'Usuario desconocido';
      })
      .filter(Boolean);

    return names.join(', ');
  }

  goHome(): void {
    this.location.back();
  }

  // Funciones para el modal de valoraciones
  openRatingsModal(evento: Evento): void {
    if (!evento._id) {
      alert('Este evento no tiene ID válido.');
      return;
    }

    this.ratingsEventoId = evento._id;
    this.ratingsEventoName = evento.name;
    this.ratingsAvg = evento.avgRating;
    this.ratingsCount = evento.ratingsCount;

    this.showRatingsModal = true;
    this.ratingsPage = 1;
    this.loadRatingsList();
  }

  closeRatingsModal(): void {
    this.showRatingsModal = false;
    this.ratingsEventoId = null;
    this.ratingsEventoName = '';
    this.ratingsList = [];
    this.ratingsError = '';
    this.ratingsPage = 1;
    this.ratingsTotalItems = 0;
    this.ratingsTotalPages = 1;
  }

  loadRatingsList(): void {
    if (!this.ratingsEventoId) return;

    this.ratingsLoading = true;
    this.ratingsError = '';

    this.valoracionService
      .listByEvent(this.ratingsEventoId, this.ratingsPage, this.ratingsPageSize)
      .subscribe({
        next: (response) => {
          this.ratingsList = response.data || [];
          this.ratingsPage = response.page || 1;
          this.ratingsTotalPages = response.totalPages || 1;
          this.ratingsTotalItems = response.totalItems || 0;
          this.ratingsLoading = false;
        },
        error: (err) => {
          this.ratingsError = 'Error cargando valoraciones';
          this.ratingsList = [];
          this.ratingsTotalItems = 0;
          this.ratingsTotalPages = 1;
          this.ratingsPage = 1;
          this.ratingsLoading = false;
        }
      });
  }

  changeRatingsPage(delta: number): void {
    const newPage = this.ratingsPage + delta;
    if (newPage >= 1 && newPage <= this.ratingsTotalPages) {
      this.ratingsPage = newPage;
      this.loadRatingsList();
    }
  }

  goToRatings(evento: Evento): void {
    this.openRatingsModal(evento);
  }
}